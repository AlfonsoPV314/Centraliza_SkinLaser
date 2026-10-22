// Arma la petición de importación a partir de las filas procesadas y las decisiones sobre duplicados.
import type {
  AccionDuplicado,
  DecisionDuplicado,
  PeticionImportacion,
} from "@/contracts"
import { definicion, type MapeoColumna } from "@/domain/columns"
import type {
  FilaGuardada,
  FilaProcesada,
  TipoCampo,
  TipoPlanilla,
} from "@/domain/model"
import { detectarDuplicados } from "@/domain/duplicates"
import { tieneErrores } from "@/domain/rules"

export interface DuplicadoLote {
  /** Índice de la fila nueva dentro de `validas`. */
  indice: number
  /** Fila guardada con la que coincide, o índice (en `validas`) de otra fila del mismo lote. */
  contra: { origen: "guardado"; fila: FilaGuardada } | {
    origen: "archivo"
    indice: number
  }
  accion: AccionDuplicado
}

export interface Lote {
  validas: FilaProcesada[]
  conError: FilaProcesada[]
  duplicados: DuplicadoLote[]
}

/** Separa filas válidas y con error, y detecta duplicados contra lo guardado y dentro del mismo lote. */
export function clasificar(
  filas: FilaProcesada[],
  guardadas: FilaGuardada[],
  accionInicial: AccionDuplicado = "decidir_despues",
): Lote {
  const validas = filas.filter((f) => !tieneErrores(f))
  const conError = filas.filter(tieneErrores)
  const duplicados = detectarDuplicados(validas, guardadas).map<DuplicadoLote>(
    (c) => ({ indice: c.indiceNueva, contra: c.contra, accion: accionInicial }),
  )
  return { validas, conError, duplicados }
}

export function armarPeticion(
  lote: Lote,
  archivos: PeticionImportacion["archivos"],
  columnasExtra: PeticionImportacion["columnasExtra"],
): PeticionImportacion {
  const enDuplicado = new Set(lote.duplicados.map((d) => d.indice))
  // Dentro del lote, todos los duplicados apuntan a la primera aparición («original»). Se resuelven en orden:
  // «conservar la nueva» reemplaza a la fila que en ese momento representa a la original, que deja de guardarse.
  const representante = new Map<number, number>()
  const contraparte = new Map<number, number>()
  const superadas = new Set<number>()
  for (const d of [...lote.duplicados].sort((a, b) => a.indice - b.indice)) {
    if (d.contra.origen !== "archivo") continue
    const actual = representante.get(d.contra.indice) ?? d.contra.indice
    contraparte.set(d.indice, actual)
    if (d.accion === "conservar_nueva") {
      superadas.add(actual)
      representante.set(d.contra.indice, d.indice)
    }
  }
  const decisiones: DecisionDuplicado[] = lote.duplicados.map((d) => {
    if (d.contra.origen === "guardado")
      return {
        nueva: lote.validas[d.indice],
        accion: d.accion,
        existenteId: d.contra.fila.id,
        existente: d.contra.fila,
      }
    // Las pendientes se comparan con la fila que finalmente queda guardada.
    const contra =
      d.accion === "decidir_despues"
        ? (representante.get(d.contra.indice) ?? d.contra.indice)
        : contraparte.get(d.indice)!
    return {
      nueva: lote.validas[d.indice],
      // Una fila elegida como «nueva» que luego fue reemplazada por otra posterior termina descartada.
      accion: superadas.has(d.indice) ? "conservar_anterior" : d.accion,
      existenteId: null,
      existente: lote.validas[contra],
    }
  })
  return {
    archivos,
    insertar: lote.validas.filter(
      (_, i) => !enDuplicado.has(i) && !superadas.has(i),
    ),
    decisiones,
    conError: lote.conError,
    columnasExtra,
  }
}

/** Columnas extra (no conocidas) que se agregarán al catálogo. */
export function columnasExtraDe(
  mapeos: MapeoColumna[][],
): { clave: string; etiqueta: string; tipo: TipoCampo }[] {
  const vistas = new Map<string, {
    clave: string
    etiqueta: string
    tipo: TipoCampo
  }>()
  for (const m of mapeos.flat()) {
    if (m.destino === "extra" && m.claveExtra && !vistas.has(m.claveExtra))
      vistas.set(m.claveExtra, {
        clave: m.claveExtra,
        etiqueta: m.encabezado,
        tipo: m.tipoExtra ?? "texto",
      })
  }
  return [...vistas.values()]
}

/** Problemas de un mapeo que impiden procesar la hoja. */
export function problemasMapeo(
  mapeo: MapeoColumna[],
  tipo: TipoPlanilla,
): string[] {
  const p: string[] = []
  if (!mapeo.some((m) => m.destino === "documento"))
    p.push("Indique qué columna tiene el RUN o pasaporte.")
  if (tipo === "pagos" && !mapeo.some((m) => m.destino === "monto"))
    p.push("Una planilla de pagos necesita la columna de monto.")
  const usados = new Map<string, number>()
  for (const m of mapeo)
    if (m.destino !== "extra" && m.destino !== "ignorar")
      usados.set(m.destino, (usados.get(m.destino) ?? 0) + 1)
  for (const [campo, n] of usados)
    if (n > 1)
      p.push(
        `El campo «${definicion(campo)?.etiqueta ?? campo}» está asignado a ${n} columnas; deje solo una.`,
      )
  return p
}

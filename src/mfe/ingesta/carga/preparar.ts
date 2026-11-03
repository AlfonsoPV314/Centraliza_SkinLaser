// Arma la petición de importación a partir de las filas procesadas y las decisiones sobre duplicados.
import type {
  AccionDuplicado,
  CombinacionCeldas,
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
import { normalizarTexto } from "@/domain/text"

export interface DuplicadoLote {
  /** Índice de la fila nueva dentro de `validas`. */
  indice: number
  /** Fila guardada con la que coincide, o índice (en `validas`) de otra fila del mismo lote. */
  contra: { origen: "guardado"; fila: FilaGuardada } | {
    origen: "archivo"
    indice: number
  }
  accion: AccionDuplicado
  /** Solo con accion «combinar»: fila resultante (ya revalidada) y lado elegido por campo. */
  combinada?: { fila: FilaProcesada; combinacion: CombinacionCeldas }
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
    if (d.accion === "conservar_nueva" || (d.accion === "combinar" && d.combinada)) {
      superadas.add(actual)
      representante.set(d.contra.indice, d.indice)
    }
  }
  const decisiones: DecisionDuplicado[] = lote.duplicados.map((d) => {
    // Una combinación sin fila resultante no es válida: queda pendiente para decidir después.
    const combinar = d.accion === "combinar" && d.combinada ? d.combinada : null
    const accion: AccionDuplicado =
      d.accion === "combinar" && !combinar ? "decidir_despues" : d.accion
    const nueva = combinar?.fila ?? lote.validas[d.indice]
    const extra = combinar ? { combinacion: combinar.combinacion } : {}
    if (d.contra.origen === "guardado")
      return {
        nueva,
        accion,
        existenteId: d.contra.fila.id,
        existente: d.contra.fila,
        ...extra,
      }
    // Las pendientes se comparan con la fila que finalmente queda guardada.
    const contra =
      accion === "decidir_despues"
        ? (representante.get(d.contra.indice) ?? d.contra.indice)
        : contraparte.get(d.indice)!
    return {
      nueva,
      // Una fila elegida como «nueva» que luego fue reemplazada por otra posterior termina descartada.
      accion: superadas.has(d.indice) ? "conservar_anterior" : accion,
      existenteId: null,
      existente: lote.validas[contra],
      ...extra,
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
  // Los pagos pueden venir sin RUN; los pacientes no.
  if (faltaDocumento(mapeo, tipo))
    p.push(
      "Indique qué columna contiene el RUN o pasaporte: elija «RUN / pasaporte» en «Se guarda como».",
    )
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

export const faltaDocumento = (mapeo: MapeoColumna[], tipo: TipoPlanilla) =>
  tipo === "pacientes" && !mapeo.some((m) => m.destino === "documento")

/** Forma comparable de un encabezado o filtro: sin tildes, en minúsculas y con espacios simples. */
export const claveFiltro = (texto: string) => normalizarTexto(texto).replace(/\s+/g, " ").trim()

export const esIgnoradaPermanente = (encabezado: string, ignoradas: string[]) => {
  const k = claveFiltro(encabezado)
  return ignoradas.some((i) => claveFiltro(i) === k)
}

/** Marca como «No importar» las columnas cuyo encabezado coincide con un filtro predeterminado. */
export function aplicarIgnoradas(
  mapeo: MapeoColumna[],
  ignoradas: string[],
): MapeoColumna[] {
  if (!ignoradas.length) return mapeo
  const set = new Set(ignoradas.map(claveFiltro))
  return mapeo.map((m) =>
    set.has(claveFiltro(m.encabezado)) ? { ...m, destino: "ignorar" } : m,
  )
}

/**
 * Aplica una lista de filtros editada a un mapeo abierto: las columnas que ahora coinciden pasan a
 * «No importar» y las que solo estaban excluidas por un filtro quitado vuelven a su sugerencia original.
 */
export function sincronizarIgnoradas(
  mapeo: MapeoColumna[],
  sugerido: MapeoColumna[],
  previas: string[],
  nuevas: string[],
): MapeoColumna[] {
  let cambio = false
  const r = mapeo.map((m) => {
    if (esIgnoradaPermanente(m.encabezado, nuevas)) {
      if (m.destino === "ignorar") return m
      cambio = true
      return { ...m, destino: "ignorar" as const }
    }
    if (m.destino === "ignorar" && esIgnoradaPermanente(m.encabezado, previas)) {
      const original = sugerido.find((o) => o.indice === m.indice)
      if (original && original.destino !== "ignorar") {
        cambio = true
        return { ...original }
      }
    }
    return m
  })
  return cambio ? r : mapeo
}

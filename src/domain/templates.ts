// Plantillas de reportes: qué archivos genera y qué contiene cada uno.
import { grupoVacio, nuevoId, type Grupo } from "./filters"
import type { TipoCampo } from "./model"
import { MARCADORES, TEXTO_PROSA_PREDETERMINADO } from "./prose"
import { MEDIDAS_NUMERICAS, type Medida } from "./stats"

export type TipoGrafico = "barras" | "barras_apiladas" | "lineas" | "tendencia" | "areas" | "circular" | "anillo" | "histograma" | "dispersion" | "caja" | "heatmap"
export type Agregacion = "conteo" | "suma" | "promedio"

export const ETIQUETAS_GRAFICO: Record<TipoGrafico, {
  nombre: string
  ayuda: string
}> = {
  barras: { nombre: "Barras", ayuda: "Compara cantidades entre categorías." },
  barras_apiladas: {
    nombre: "Barras apiladas",
    ayuda: "Compara categorías desglosadas por un segundo campo.",
  },
  lineas: { nombre: "Líneas", ayuda: "Evolución en el tiempo." },
  tendencia: {
    nombre: "Tendencia",
    ayuda: "Evolución con línea de tendencia (regresión lineal).",
  },
  areas: { nombre: "Áreas", ayuda: "Evolución acumulada en el tiempo." },
  circular: {
    nombre: "Circular",
    ayuda: "Proporción de cada categoría sobre el total.",
  },
  anillo: {
    nombre: "Anillo",
    ayuda: "Como el circular, con el total al centro.",
  },
  histograma: {
    nombre: "Histograma",
    ayuda: "Distribución de un valor numérico en tramos.",
  },
  dispersion: {
    nombre: "Dispersión",
    ayuda: "Relación entre dos valores numéricos.",
  },
  caja: {
    nombre: "Caja (box plot)",
    ayuda: "Mediana, cuartiles y extremos por categoría.",
  },
  heatmap: {
    nombre: "Mapa de calor",
    ayuda: "Concentración por día de la semana y hora.",
  },
}

export type Bloque = {
  id: string
  tipo: "tabla"
  titulo: string
  campos: string[]
} | {
  id: string
  tipo: "grafico"
  titulo: string
  grafico: TipoGrafico
  campoX: string
  campoY?: string
  agregacion: Agregacion
  campoSerie?: string
} | {
  id: string
  tipo: "medidas"
  titulo: string
  campo: string
  medidas: Medida[]
} | { id: string; tipo: "texto"; titulo: string; campo: string; texto: string }

export type FormatoArchivo = "excel" | "pdf"

export interface ArchivoPlantilla {
  id: string
  formato: FormatoArchivo
  nombre: string
  bloques: Bloque[]
}

export interface Plantilla {
  id: string
  nombre: string
  descripcion: string
  archivos: ArchivoPlantilla[]
  /** Filtros por defecto; se pueden ajustar al generar. */
  filtros: Grupo
  /** Campo de fecha usado para el período (por defecto, fecha de registro en PhilaxMed). */
  campoFecha: string
  /** Unidad de análisis: filas tal como vienen o citas consolidadas (solo pagos). */
  unidad: "filas" | "citas"
  uso: { veces: number; ultimoUso: string | null }
  creadaEn: string
  actualizadaEn: string
  eliminadaEn: string | null
}

export type TipoSalida = "excel" | "pdf" | "ambos"

export function tipoSalida(p: Pick<Plantilla, "archivos">): TipoSalida | null {
  const f = new Set(p.archivos.map((a) => a.formato))
  if (f.has("excel") && f.has("pdf")) return "ambos"
  if (f.has("excel")) return "excel"
  if (f.has("pdf")) return "pdf"
  return null
}

export function camposDeBloque(b: Bloque): string[] {
  switch (b.tipo) {
    case "tabla":
      return b.campos
    case "grafico":
      return [b.campoX, b.campoY, b.campoSerie].filter((x): x is string => !!x)
    case "medidas":
    case "texto":
      return [b.campo]
  }
}

/** Campos activos de la plantilla (usados en algún bloque). */
export function camposActivos(p: Pick<Plantilla, "archivos">): string[] {
  return [
    ...new Set(p.archivos.flatMap((a) => a.bloques.flatMap(camposDeBloque))),
  ].filter((c) => !c.startsWith("__"))
}

// ---------- Construcción ----------

export type TipoBloque = Bloque["tipo"]
export type DatosEditablesPlantilla = Pick<Plantilla, "nombre" | "descripcion" | "archivos" | "filtros" | "campoFecha" | "unidad">

export const plantillaVacia = (
  campoFecha = "fecha_registro",
): DatosEditablesPlantilla => ({
  nombre: "",
  descripcion: "",
  campoFecha,
  unidad: "filas",
  filtros: grupoVacio("Y"),
  archivos: [archivoNuevo("pdf")],
})

export function archivoNuevo(formato: FormatoArchivo): ArchivoPlantilla {
  return { id: nuevoId("a"), formato, nombre: "", bloques: [] }
}

export function bloqueNuevo(tipo: TipoBloque, campoNumerico = "monto"): Bloque {
  const id = nuevoId("b")
  switch (tipo) {
    case "tabla":
      return {
        id,
        tipo,
        titulo: "Detalle",
        campos: ["documento", "nombre_completo"],
      }
    case "grafico":
      return {
        id,
        tipo,
        titulo: "",
        grafico: "barras",
        campoX: "",
        agregacion: "conteo",
      }
    case "medidas":
      return {
        id,
        tipo,
        titulo: "Resumen",
        campo: campoNumerico,
        medidas: ["conteo", "suma", "promedio"],
      }
    case "texto":
      return {
        id,
        tipo,
        titulo: "Resumen",
        campo: campoNumerico,
        texto: TEXTO_PROSA_PREDETERMINADO,
      }
  }
}

// ---------- Requisitos de cada gráfico ----------

/** Qué ejes pide cada tipo de gráfico (lo usan el editor y la validación). */
export const REQUISITOS_GRAFICO: Record<TipoGrafico, {
  x: "categoria" | "numero" | null
  y: "agregacion" | "numero" | "opcional_numero" | null
  serie: boolean
}> = {
  barras: { x: "categoria", y: "agregacion", serie: false },
  barras_apiladas: { x: "categoria", y: "agregacion", serie: true },
  lineas: { x: "categoria", y: "agregacion", serie: false },
  tendencia: { x: "categoria", y: "agregacion", serie: false },
  areas: { x: "categoria", y: "agregacion", serie: false },
  circular: { x: "categoria", y: "agregacion", serie: false },
  anillo: { x: "categoria", y: "agregacion", serie: false },
  histograma: { x: "numero", y: null, serie: false },
  dispersion: { x: "numero", y: "numero", serie: false },
  caja: { x: "categoria", y: "numero", serie: false },
  heatmap: { x: null, y: null, serie: false },
}

export const esNumerico = (t: TipoCampo | undefined) =>
  t === "numero" || t === "monto"

/** Ajusta el bloque al cambiar de tipo de gráfico, limpiando ejes que ya no aplican. */
export function cambiarTipoGrafico(
  b: Extract<Bloque, { tipo: "grafico" }>,
  grafico: TipoGrafico,
): Extract<Bloque, { tipo: "grafico" }> {
  const r = REQUISITOS_GRAFICO[grafico]
  const n: Extract<Bloque, { tipo: "grafico" }> = { ...b, grafico }
  if (grafico === "heatmap")
    return {
      ...n,
      campoX: "__dia_semana",
      campoY: undefined,
      campoSerie: undefined,
      agregacion: "conteo",
    }
  if (b.grafico === "heatmap") n.campoX = ""
  if (!r.serie) n.campoSerie = undefined
  if (r.y === null) {
    n.campoY = undefined
    n.agregacion = "conteo"
  }
  if (r.y === "numero") n.agregacion = "conteo"
  return n
}

// ---------- Validación ----------

/**
 * Errores de la plantilla, indexados por ruta:
 * 'nombre', 'campoFecha', 'archivos', 'archivo:<id>:nombre', 'archivo:<id>:bloques', 'bloque:<id>:<campo>'.
 * `tipoDe` devuelve el tipo del campo o undefined si ya no existe en el catálogo.
 */
export function validarPlantilla(
  p: DatosEditablesPlantilla,
  tipoDe: (campo: string) => TipoCampo | undefined,
): Record<string, string> {
  const e: Record<string, string> = {}
  const nombre = p.nombre.trim()
  if (!nombre) e.nombre = "Escribe un nombre para la plantilla."
  else if (nombre.length > 120)
    e.nombre = "El nombre no puede superar 120 caracteres."
  if (p.descripcion.length > 500)
    e.descripcion = "La descripción no puede superar 500 caracteres."
  if (!p.campoFecha)
    e.campoFecha = "Elige el campo de fecha que define el período."
  else if (tipoDe(p.campoFecha) !== "fecha")
    e.campoFecha = "El campo elegido no es una fecha o ya no existe."

  if (!p.archivos.length) e.archivos = "Agrega al menos un archivo de salida."
  const nombresArchivo = new Map<string, string>()
  for (const a of p.archivos) {
    const n = a.nombre.trim()
    if (!n) e[`archivo:${a.id}:nombre`] = "Escribe un nombre para el archivo."
    else if (/[\\/:*?"<>|]/.test(n))
      e[`archivo:${a.id}:nombre`] =
        'El nombre no puede tener \\ / : * ? " < > |'
    else {
      const clave = `${a.formato}|${n.toLocaleLowerCase("es")}`
      if (nombresArchivo.has(clave))
        e[`archivo:${a.id}:nombre`] =
          "Ya hay otro archivo del mismo formato con este nombre."
      nombresArchivo.set(clave, a.id)
    }
    if (!a.bloques.length)
      e[`archivo:${a.id}:bloques`] =
        "Agrega al menos un contenido a este archivo."
    for (const b of a.bloques) Object.assign(e, validarBloque(b, tipoDe))
  }
  return e
}

function validarBloque(
  b: Bloque,
  tipoDe: (campo: string) => TipoCampo | undefined,
): Record<string, string> {
  const e: Record<string, string> = {}
  const k = (c: string) => `bloque:${b.id}:${c}`
  const existe = (c: string) => tipoDe(c) !== undefined
  const exigir = (
    campo: string,
    valor: string | undefined,
    mensaje: string,
  ) => {
    if (!valor) e[k(campo)] = mensaje
    else if (!existe(valor))
      e[k(campo)] = "Este campo ya no existe en los datos."
  }
  switch (b.tipo) {
    case "tabla": {
      if (!b.campos.length) e[k("campos")] = "Elige al menos una columna."
      const faltan = b.campos.filter((c) => !existe(c))
      if (faltan.length)
        e[k("campos")] = `Estas columnas ya no existen: ${faltan.join(", ")}.`
      break
    }
    case "grafico": {
      const r = REQUISITOS_GRAFICO[b.grafico]
      if (r.x) {
        exigir(
          "campoX",
          b.campoX,
          r.x === "numero"
            ? "Elige el valor numérico a distribuir."
            : "Elige por qué campo agrupar.",
        )
        if (
          !e[k("campoX")] &&
          r.x === "numero" &&
          !esNumerico(tipoDe(b.campoX))
        )
          e[k("campoX")] = "Este gráfico necesita un campo numérico."
      }
      const necesitaY =
        r.y === "numero" || (r.y === "agregacion" && b.agregacion !== "conteo")
      if (necesitaY) {
        exigir("campoY", b.campoY, "Elige el valor numérico.")
        if (!e[k("campoY")] && !esNumerico(tipoDe(b.campoY!)))
          e[k("campoY")] = "Este valor debe ser numérico."
      }
      if (r.serie) {
        exigir(
          "campoSerie",
          b.campoSerie,
          "Elige el campo que desglosa cada barra.",
        )
        if (!e[k("campoSerie")] && b.campoSerie === b.campoX)
          e[k("campoSerie")] = "Debe ser distinto del campo de agrupación."
      }
      break
    }
    case "medidas": {
      exigir("campo", b.campo, "Elige el campo a resumir.")
      if (!b.medidas.length) e[k("medidas")] = "Elige al menos una medida."
      else if (
        !e[k("campo")] &&
        !esNumerico(tipoDe(b.campo)) &&
        b.medidas.some(
          (m) => MEDIDAS_NUMERICAS.includes(m) || m === "variacion",
        )
      )
        e[k("medidas")] =
          "Las medidas numéricas requieren un campo numérico; con este campo solo aplican conteo, moda y porcentaje."
      break
    }
    case "texto": {
      exigir("campo", b.campo, "Elige el campo que describe el texto.")
      if (!b.texto.trim()) e[k("texto")] = "Escribe el texto."
      else {
        const validos = new Set<string>(MARCADORES.map((m) => m.clave))
        const malos = [...b.texto.matchAll(/\{([^{}]*)\}/g)]
          .map((m) => m[1])
          .filter((m) => !validos.has(m))
        if (malos.length)
          e[k("texto")] =
            `Marcadores desconocidos: ${[...new Set(malos)].map((m) => `{${m}}`).join(", ")}.`
        else if (
          (b.texto.match(/\{/g) ?? []).length !==
          (b.texto.match(/\}/g) ?? []).length
        )
          e[k("texto")] = "Hay una llave sin cerrar."
      }
      break
    }
  }
  return e
}

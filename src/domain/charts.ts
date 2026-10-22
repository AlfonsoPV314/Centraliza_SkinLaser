// Agregaciones puras para gráficos (independientes de la librería de gráficos).
import { DIAS_CORTOS, MESES_CORTOS } from "./dates"
import { percentil, promedio, suma } from "./stats"
import type { Registro } from "./model"
import type { Agregacion } from "./templates"

export function etiquetaCategoria(
  campo: string,
  valor: string | number | null,
): string {
  if (valor === null || valor === "") return "Sin dato"
  if (campo === "__dia_semana")
    return DIAS_CORTOS[Number(valor) - 1] ?? String(valor)
  if (campo === "__mes" && typeof valor === "string") {
    const [a, m] = valor.split("-")
    return `${MESES_CORTOS[Number(m) - 1]} ${a}`
  }
  if (campo === "__hora") return `${String(valor).padStart(2, "0")}:00`
  if (campo === "__trimestre" && typeof valor === "string")
    return valor.replace("-T", " T")
  return String(valor)
}

function ordenar(a: string | number, b: string | number) {
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a).localeCompare(String(b), "es")
}

function agregar(valores: number[], agregacion: Agregacion, n: number): number {
  if (agregacion === "conteo") return n
  if (agregacion === "suma") return suma(valores)
  return promedio(valores) ?? 0
}

export interface Serie {
  nombre: string
  valores: number[]
}
export interface DatosCategoricos {
  categorias: string[]
  series: Serie[]
}

/** Agrupa por campoX (y opcionalmente por campoSerie) y agrega campoY. */
export function agrupar(
  registros: Registro[],
  campoX: string,
  agregacion: Agregacion,
  campoY?: string,
  campoSerie?: string,
  maxCategorias = 24,
): DatosCategoricos {
  const grupos = new Map<string | number, Map<string, {
    valores: number[]
    n: number
  }>>()
  const nombresSerie = new Set<string>()
  for (const r of registros) {
    const x = r[campoX] ?? "Sin dato"
    const s = campoSerie ? String(r[campoSerie] ?? "Sin dato") : "Total"
    nombresSerie.add(s)
    const g = grupos.get(x) ?? new Map()
    const celda = g.get(s) ?? { valores: [], n: 0 }
    celda.n++
    const y = campoY ? r[campoY] : null
    if (typeof y === "number") celda.valores.push(y)
    g.set(s, celda)
    grupos.set(x, g)
  }
  let claves = [...grupos.keys()]
  const temporal = campoX.startsWith("__") || /fecha/.test(campoX)
  if (temporal) claves.sort(ordenar)
  else {
    const total = (k: string | number) =>
      [...grupos.get(k)!.values()].reduce(
        (a, c) => a + agregar(c.valores, agregacion, c.n),
        0,
      )
    claves.sort((a, b) => total(b) - total(a))
    if (claves.length > maxCategorias) claves = claves.slice(0, maxCategorias)
  }
  const series = [...nombresSerie].sort().map((nombre) => ({
    nombre,
    valores: claves.map((k) => {
      const c = grupos.get(k)!.get(nombre)
      return c ? Math.round(agregar(c.valores, agregacion, c.n) * 100) / 100 : 0
    }),
  }))
  return { categorias: claves.map((k) => etiquetaCategoria(campoX, k)), series }
}

/** Regresión lineal simple sobre una serie (para la línea de tendencia). */
export function tendenciaLineal(valores: number[]): number[] {
  const n = valores.length
  if (n < 2) return [...valores]
  const xs = valores.map((_, i) => i)
  const mx = promedio(xs)!,
    my = promedio(valores)!
  const num = xs.reduce((a, x, i) => a + (x - mx) * (valores[i] - my), 0)
  const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0)
  const m = den ? num / den : 0
  return xs.map((x) => Math.round((my + m * (x - mx)) * 100) / 100)
}

export function histograma(
  valores: number[],
  tramos = 10,
): { categorias: string[]; valores: number[] } {
  if (!valores.length) return { categorias: [], valores: [] }
  const min = Math.min(...valores),
    max = Math.max(...valores)
  const ancho = (max - min) / tramos || 1
  const conteos = new Array(tramos).fill(0)
  for (const v of valores)
    conteos[Math.min(tramos - 1, Math.floor((v - min) / ancho))]++
  const fmt = (x: number) =>
    new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(x)
  return {
    categorias: conteos.map(
      (_, i) => `${fmt(min + i * ancho)}–${fmt(min + (i + 1) * ancho)}`,
    ),
    valores: conteos,
  }
}

export function cajas(
  registros: Registro[],
  campoX: string,
  campoY: string,
): { categorias: string[]; datos: number[][] } {
  const g = new Map<string | number, number[]>()
  for (const r of registros) {
    const y = r[campoY]
    if (typeof y !== "number") continue
    const x = r[campoX] ?? "Sin dato"
    g.set(x, [...(g.get(x) ?? []), y])
  }
  const claves = [...g.keys()].sort(ordenar).slice(0, 20)
  return {
    categorias: claves.map((k) => etiquetaCategoria(campoX, k)),
    datos: claves.map((k) => {
      const v = g.get(k)!
      return [
        Math.min(...v),
        percentil(v, 25)!,
        percentil(v, 50)!,
        percentil(v, 75)!,
        Math.max(...v),
      ]
    }),
  }
}

/** Matriz día de la semana × hora (conteo de filas). */
export function mapaCalor(
  registros: Registro[],
): {
  dias: string[]
  horas: string[]
  datos: [number, number, number][]
  maximo: number
} {
  const m = new Map<string, number>()
  for (const r of registros) {
    if (typeof r.__dia_semana !== "number" || typeof r.__hora !== "number")
      continue
    const k = `${r.__hora}|${r.__dia_semana - 1}`
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  const datos: [number, number, number][] = []
  let maximo = 0
  for (let h = 0; h < 24; h++)
    for (let d = 0; d < 7; d++) {
      const v = m.get(`${h}|${d}`) ?? 0
      maximo = Math.max(maximo, v)
      datos.push([h, d, v])
    }
  return {
    dias: DIAS_CORTOS,
    horas: Array.from(
      { length: 24 },
      (_, h) => `${String(h).padStart(2, "0")}`,
    ),
    datos,
    maximo,
  }
}

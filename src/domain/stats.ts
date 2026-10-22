// Medidas estadísticas. Desviación estándar muestral (n − 1); percentiles con interpolación lineal.

export type Medida = "conteo" | "suma" | "promedio" | "mediana" | "moda" | "minimo" | "maximo" | "desviacion" | "p25" | "p75" | "p90" | "porcentaje" | "variacion"

export const ETIQUETAS_MEDIDA: Record<Medida, string> = {
  conteo: "Conteo",
  suma: "Suma",
  promedio: "Promedio",
  mediana: "Mediana",
  moda: "Moda",
  minimo: "Mínimo",
  maximo: "Máximo",
  desviacion: "Desviación estándar",
  p25: "Percentil 25",
  p75: "Percentil 75",
  p90: "Percentil 90",
  porcentaje: "Porcentaje con dato",
  variacion: "Variación vs. período anterior",
}

export const MEDIDAS_NUMERICAS: Medida[] = [
  "suma",
  "promedio",
  "mediana",
  "minimo",
  "maximo",
  "desviacion",
  "p25",
  "p75",
  "p90",
]
export const TODAS_LAS_MEDIDAS = Object.keys(ETIQUETAS_MEDIDA) as Medida[]

export const suma = (v: number[]) => v.reduce((a, b) => a + b, 0)
export const promedio = (v: number[]) => (v.length ? suma(v) / v.length : null)

export function percentil(v: number[], p: number): number | null {
  if (!v.length) return null
  const o = [...v].sort((a, b) => a - b)
  const pos = (o.length - 1) * (p / 100)
  const base = Math.floor(pos)
  const resto = pos - base
  return o[base + 1] !== undefined
    ? o[base] + resto * (o[base + 1] - o[base])
    : o[base]
}

export const mediana = (v: number[]) => percentil(v, 50)

export function moda(v: (number | string)[]): number | string | null {
  if (!v.length) return null
  const c = new Map<number | string, number>()
  let mejor: number | string = v[0]
  let max = 0
  for (const x of v) {
    const k = (c.get(x) ?? 0) + 1
    c.set(x, k)
    if (k > max) [max, mejor] = [k, x]
  }
  return mejor
}

export function desviacion(v: number[]): number | null {
  if (v.length < 2) return null
  const m = promedio(v)!
  return Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1))
}

export interface ContextoMedidas {
  /** Total de filas del reporte (para el porcentaje). */
  total: number
  /** Valores del mismo campo en el período anterior de igual duración (para la variación). */
  anterior?: (number | string | null)[]
}

export type ResultadoMedidas = Partial<Record<Medida, number | string | null>>

export function calcularMedidas(
  valores: (number | string | null)[],
  medidas: Medida[],
  ctx: ContextoMedidas,
): ResultadoMedidas {
  const llenos = valores.filter(
    (v): v is number | string => v !== null && v !== "",
  )
  const nums = llenos
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((x) => Number.isFinite(x))
  const esNumerico = llenos.length > 0 && nums.length === llenos.length
  const r: ResultadoMedidas = {}
  for (const m of medidas) {
    switch (m) {
      case "conteo":
        r[m] = llenos.length
        break
      case "suma":
        r[m] = esNumerico ? suma(nums) : null
        break
      case "promedio":
        r[m] = esNumerico ? promedio(nums) : null
        break
      case "mediana":
        r[m] = esNumerico ? mediana(nums) : null
        break
      case "moda":
        r[m] = moda(llenos)
        break
      case "minimo":
        r[m] = esNumerico ? Math.min(...nums) : null
        break
      case "maximo":
        r[m] = esNumerico ? Math.max(...nums) : null
        break
      case "desviacion":
        r[m] = esNumerico ? desviacion(nums) : null
        break
      case "p25":
        r[m] = esNumerico ? percentil(nums, 25) : null
        break
      case "p75":
        r[m] = esNumerico ? percentil(nums, 75) : null
        break
      case "p90":
        r[m] = esNumerico ? percentil(nums, 90) : null
        break
      case "porcentaje":
        r[m] = ctx.total ? (llenos.length / ctx.total) * 100 : null
        break
      case "variacion": {
        if (!ctx.anterior) {
          r[m] = null
          break
        }
        const prev = ctx.anterior.filter(
          (v): v is number | string => v !== null && v !== "",
        )
        const prevNums = prev.map(Number).filter(Number.isFinite)
        const actual = esNumerico ? suma(nums) : llenos.length
        const antes = esNumerico ? suma(prevNums) : prev.length
        r[m] = antes ? ((actual - antes) / antes) * 100 : null
        break
      }
    }
  }
  return r
}

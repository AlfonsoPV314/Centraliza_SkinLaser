const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
})
const numero = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 })
const entero = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 })

/** $1.234.567 */
export function formatearCLP(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—"
  return clp.format(valor)
}

export function formatearNumero(
  valor: number | null | undefined,
  decimales = 2,
): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—"
  return decimales === 0
    ? entero.format(valor)
    : new Intl.NumberFormat("es-CL", {
        maximumFractionDigits: decimales,
      }).format(valor)
}

export function formatearPorcentaje(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—"
  return `${numero.format(valor)} %`
}

/** "$45.000", "45.000", "45000,50" → número. */
export function parsearMonto(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null
  if (valor === null || valor === undefined) return null
  let s = String(valor)
    .trim()
    .replace(/\$|clp|\s/gi, "")
  if (!s) return null
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))
    s = s.replace(/\./g, "").replace(",", ".")
  else if (/^-?\d+,\d+$/.test(s)) s = s.replace(",", ".")
  else if (/^-?\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, "")
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null
  return Number(s)
}

/** Plural simple: plural(3, 'fila') → "3 filas". */
export function plural(
  n: number,
  singular: string,
  pluralForma?: string,
): string {
  return `${formatearNumero(n, 0)} ${
    n === 1 ? singular : (pluralForma ?? `${singular}s`)
  }`
}

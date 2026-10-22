// Normalización de texto: reglas puras, sin dependencias de React ni del navegador.

const CONTROL = /[\u0000-\u001F\u007F-\u009F\u200B-\u200D\u2028\u2029\uFEFF]/g

/** Valor "original" limpio: sin caracteres de control ni espacios sobrantes, conservando mayúsculas y tildes. */
export function limpiarOriginal(valor: unknown): string {
  if (valor === null || valor === undefined) return ""
  return String(valor).replace(CONTROL, " ").replace(/\s+/g, " ").trim()
}

/** Valor normalizado: minúsculas, sin tildes ni diacríticos (la ñ queda como n), sin espacios sobrantes. */
export function normalizarTexto(valor: unknown): string {
  return limpiarOriginal(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

/** Convierte un encabezado en una clave estable: «Fecha de Nacimiento» → «fecha_de_nacimiento». */
export function claveDesdeEncabezado(encabezado: unknown): string {
  return normalizarTexto(encabezado)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Une una lista en español: ["a","b","c"] → "a, b y c". */
export function unirLista(items: string[], conector = "y"): string {
  if (items.length <= 1) return items.join("")
  return `${items.slice(0, -1).join(", ")} ${conector} ${items[items.length - 1]}`
}

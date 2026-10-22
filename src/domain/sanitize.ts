/**
 * Mitigación de inyección de fórmulas al exportar a Excel/CSV:
 * los textos que comienzan con = + - @ (o tabulación / retorno) se anteponen con un apóstrofo.
 */
export function neutralizarCelda<T>(valor: T): T | string {
  if (typeof valor !== "string") return valor
  return /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor
}

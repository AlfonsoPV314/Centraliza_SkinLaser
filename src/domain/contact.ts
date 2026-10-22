import { limpiarOriginal } from "./text"

const CORREO = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

export function normalizarCorreo(valor: unknown): string {
  return limpiarOriginal(valor).toLowerCase().replace(/\s/g, "")
}

export function correoValido(valor: unknown): boolean {
  return CORREO.test(normalizarCorreo(valor))
}

/** j***@gmail.com */
export function enmascararCorreo(correo: string): string {
  const [usuario, dominio] = correo.split("@")
  if (!dominio) return "***"
  return `${usuario.charAt(0)}***@${dominio}`
}

/**
 * Normaliza un teléfono chileno a +56XXXXXXXXX (9 dígitos tras el código de país).
 * Devuelve null si no se puede interpretar sin adivinar.
 */
export function normalizarTelefono(valor: unknown): string | null {
  const digitos = limpiarOriginal(valor).replace(/\D/g, "")
  if (!digitos) return null
  if (digitos.length === 11 && digitos.startsWith("56")) return `+${digitos}`
  if (digitos.length === 9) return `+56${digitos}`
  return null
}

/** Celular chileno válido: +56 9 XXXX XXXX. */
export function celularValido(valor: unknown): boolean {
  const n = normalizarTelefono(valor)
  return !!n && /^\+569\d{8}$/.test(n)
}

/** +56912345678 → +56 9 1234 5678 */
export function formatearTelefono(
  normalizado: string | null | undefined,
): string {
  if (!normalizado) return ""
  const m = normalizado.match(/^\+56(\d)(\d{4})(\d{4})$/)
  return m ? `+56 ${m[1]} ${m[2]} ${m[3]}` : normalizado
}

export function enmascararTelefono(normalizado: string): string {
  return `+56 9 **** ${normalizado.slice(-4)}`
}

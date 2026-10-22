import { ApiError } from "@/contracts"

/** Mensaje en lenguaje del usuario para cualquier error (los servicios ya entregan `detalle` legible). */
export function mensajeError(
  e: unknown,
  porDefecto = "Ocurrió un problema inesperado. Vuelva a intentarlo.",
): string {
  if (e instanceof ApiError) return e.problema.detalle
  if (e instanceof Error && e.message) return e.message
  return porDefecto
}

export const estadoError = (e: unknown): number | null =>
  e instanceof ApiError ? e.problema.estado : null
export const campoError = (e: unknown): string | null =>
  e instanceof ApiError ? (e.problema.campo ?? null) : null

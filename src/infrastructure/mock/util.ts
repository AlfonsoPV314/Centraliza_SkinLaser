import { ApiError, ERRORES, type ProblemaApi } from "@/contracts/comunes"
import { db, type UsuarioRegistro } from "./db"
import type { Usuario } from "@/contracts/usuarios"

/** Latencia simulada para que los estados de carga sean visibles. */
export const esperar = (min = 120, max = 380) =>
  new Promise((r) => setTimeout(r, min + Math.random() * (max - min)))

type BaseError = typeof ERRORES[keyof typeof ERRORES] | {
  tipo: string
  estado: number
  titulo: string
}

export function error(
  base: BaseError,
  detalle: string,
  extra: Partial<ProblemaApi> = {},
): ApiError {
  return new ApiError({ ...base, detalle, ...extra })
}

export const uid = (prefijo = "") =>
  `${prefijo}${
    crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36)
  }`

export const ahora = () => new Date().toISOString()
export const enMinutos = (min: number) =>
  new Date(Date.now() + min * 60000).toISOString()

/** Hash de prototipo (SHA-256 + sal). En producción: bcrypt o argon2 en el servicio Go. */
export async function hashContrasena(
  contrasena: string,
  sal: string,
): Promise<string> {
  const datos = new TextEncoder().encode(`${sal}:${contrasena}`)
  if (crypto?.subtle) {
    const h = await crypto.subtle.digest("SHA-256", datos)
    return [...new Uint8Array(h)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }
  let h = 0
  for (const b of datos) h = (Math.imul(31, h) + b) | 0
  return String(h)
}

export function aUsuario(u: UsuarioRegistro): Usuario {
  const { hash: _h, sal: _s, ...publico } = u
  return publico
}

export async function usuarioDeToken(token: string): Promise<UsuarioRegistro> {
  const s = token ? await db.sesiones.get(token) : undefined
  if (!s || s.expiraEn < ahora())
    throw error(
      ERRORES.noAutenticado,
      "Su sesión expiró. Inicie sesión nuevamente.",
    )
  const u = await db.usuarios.get(s.usuarioId)
  if (!u || !u.activo)
    throw error(
      ERRORES.noAutenticado,
      "Su cuenta no está disponible. Contacte al administrador.",
    )
  return u
}

export async function exigirAdmin(token: string): Promise<UsuarioRegistro> {
  const u = await usuarioDeToken(token)
  if (u.rol !== "administrador")
    throw error(
      ERRORES.sinPermisos,
      "Esta acción es solo para administradores.",
    )
  return u
}

export const codigoAleatorio = () =>
  String(Math.floor(100000 + Math.random() * 900000))

export { contrasenaSegura, requisitosContrasena } from "@/domain/password"

// Microservicio Go «auth» — base: /auth/v1
import type { Usuario } from "./usuarios"

export interface Sesion {
  token: string
  usuario: Usuario
  expiraEn: string // ISO; renovación por actividad
}

export interface DatosRegistro {
  nombreUsuario: string
  correo: string
  telefono: string // +569XXXXXXXX
  contrasena: string
}

export type CanalMensaje = "sms" | "whatsapp"

export interface AuthApi {
  /** POST /auth/v1/sesiones → 201 Sesion | 401 credenciales-invalidas | 423 cuenta-desactivada */
  iniciarSesion(correo: string, contrasena: string): Promise<Sesion>
  /** GET /auth/v1/sesiones/actual → 200 Sesion | 401 */
  sesionActual(token: string): Promise<Sesion>
  /** POST /auth/v1/sesiones/actual/renovar → 200 Sesion */
  renovar(token: string): Promise<Sesion>
  /** DELETE /auth/v1/sesiones/actual → 204 */
  cerrarSesion(token: string): Promise<void>
  /** POST /auth/v1/registro → 201 Usuario | 409 correo-existente | 422 validacion */
  registrar(datos: DatosRegistro): Promise<Usuario>
  /** GET /auth/v1/registro/correo-disponible?correo= → 200 { disponible } */
  correoDisponible(correo: string): Promise<boolean>
  /** POST /auth/v1/contrasena/recuperacion → 202 (respuesta siempre genérica) */
  solicitarRecuperacionContrasena(correo: string): Promise<void>
  /** POST /auth/v1/correo/recuperacion → 202 (respuesta siempre genérica, no revela números registrados) */
  recuperarCorreo(telefono: string, canal: CanalMensaje): Promise<void>
  /** GET /auth/v1/contrasena/tokens/{token} → 200 { proposito, expiraEn } | 404 | 410 expirado */
  validarToken(token: string): Promise<{
    proposito: "recuperacion" | "confirmacion"
    expiraEn: string
  }>
  /** POST /auth/v1/contrasena/restablecer → 204 | 410 expirado */
  restablecerContrasena(token: string, nueva: string): Promise<void>
  /** POST /auth/v1/contrasena/cambiar (requiere sesión + token de confirmación) → 204 | 401 contrasena-incorrecta */
  cambiarContrasena(
    tokenSesion: string,
    tokenConfirmacion: string,
    actual: string,
    nueva: string,
  ): Promise<void>
}

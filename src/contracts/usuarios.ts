// Microservicio Go «usuarios» — base: /usuarios/v1
import type { Pagina, ParametrosPagina } from "./comunes"
import type { CanalMensaje } from "./auth"

export type Rol = "administrador" | "usuario"

export interface Preferencias {
  tema: "oscuro" | "claro"
  porPagina: number
  vistaPlantillas: "tarjetas" | "filas"
  /** Nombre de la carpeta elegida (el permiso real vive en el navegador). */
  carpetaDescarga: string | null
}

export interface Usuario {
  id: string
  nombreUsuario: string
  correo: string
  telefono: string
  rol: Rol
  activo: boolean
  correoVerificado: boolean
  creadoEn: string
  preferencias: Preferencias
}

export interface SolicitudVerificacion {
  solicitudId: string
  destinoEnmascarado: string
  canal: CanalMensaje | "correo"
  expiraEn: string
  reenviarDesde: string
}

export interface UsuariosApi {
  /** GET /usuarios/v1/usuarios?q=&pagina=&porPagina= (solo administrador) */
  listar(
    token: string,
    q: string,
    p: ParametrosPagina,
  ): Promise<Pagina<Usuario>>
  /** POST /usuarios/v1/usuarios (solo administrador) → 201 | 409 correo-existente */
  crear(
    token: string,
    datos: {
      nombreUsuario: string
      correo: string
      telefono: string
      rol: Rol
      contrasenaTemporal: string
    },
  ): Promise<Usuario>
  /** PATCH /usuarios/v1/usuarios/{id} (solo administrador) */
  actualizar(
    token: string,
    id: string,
    cambios: Partial<Pick<Usuario, "nombreUsuario" | "correo" | "telefono" | "rol" | "activo">>,
  ): Promise<Usuario>
  /** DELETE /usuarios/v1/usuarios/{id} (solo administrador) → 204 | 409 no-puede-eliminarse-a-si-mismo */
  eliminar(token: string, id: string): Promise<void>

  /** PATCH /usuarios/v1/yo */
  actualizarPerfil(
    token: string,
    cambios: { nombreUsuario?: string },
  ): Promise<Usuario>
  /** PUT /usuarios/v1/yo/preferencias */
  guardarPreferencias(
    token: string,
    preferencias: Preferencias,
  ): Promise<Usuario>
  /** POST /usuarios/v1/yo/contrasena/enlace — modo recuperación (restablecer) o confirmación (cambiar con la actual). */
  solicitarEnlaceContrasena(
    token: string,
    modo: "recuperacion" | "confirmacion",
  ): Promise<void>
  /** POST /usuarios/v1/yo/correo/solicitudes → código por SMS/WhatsApp al teléfono registrado */
  solicitarCambioCorreo(
    token: string,
    nuevoCorreo: string,
    canal: CanalMensaje,
  ): Promise<SolicitudVerificacion>
  /** POST /usuarios/v1/yo/telefono/solicitudes → código por correo electrónico */
  solicitarCambioTelefono(
    token: string,
    nuevoTelefono: string,
  ): Promise<SolicitudVerificacion>
  /** POST /usuarios/v1/yo/solicitudes/{id}/reenviar → 429 si aún no se puede reenviar */
  reenviarCodigo(
    token: string,
    solicitudId: string,
  ): Promise<SolicitudVerificacion>
  /** POST /usuarios/v1/yo/solicitudes/{id}/confirmar → 200 Usuario | 422 codigo-incorrecto | 410 codigo-expirado */
  confirmarCodigo(
    token: string,
    solicitudId: string,
    codigo: string,
  ): Promise<Usuario>
}

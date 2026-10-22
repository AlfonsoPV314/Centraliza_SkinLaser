// Microservicio Go «notificaciones» — base: /notificaciones/v1
// Punto de variación LPS: canal SMS y/o WhatsApp; correo siempre disponible.

export type CanalNotificacion = "correo" | "sms" | "whatsapp"

export interface Mensaje {
  id: string
  canal: CanalNotificacion
  destino: string
  asunto: string
  cuerpo: string
  enlace?: string
  codigo?: string
  creadoEn: string
  leido: boolean
}

export interface NotificacionesApi {
  /** POST /notificaciones/v1/mensajes (uso interno entre servicios) */
  enviar(m: Omit<Mensaje, "id" | "creadoEn" | "leido">): Promise<Mensaje>
  /** Solo prototipo: bandeja de mensajes simulados (no existe en producción). */
  listarSimulados(): Promise<Mensaje[]>
  marcarLeidos(): Promise<void>
}

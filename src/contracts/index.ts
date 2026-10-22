export * from "./comunes"
export type * from "./auth"
export type * from "./usuarios"
export type * from "./notificaciones"
export type * from "./ingesta"
export type * from "./datos"
export type * from "./plantillas"
export type * from "./reportes"

import type { AuthApi } from "./auth"
import type { UsuariosApi } from "./usuarios"
import type { NotificacionesApi } from "./notificaciones"
import type { IngestaApi } from "./ingesta"
import type { DatosApi } from "./datos"
import type { PlantillasApi } from "./plantillas"
import type { ReportesApi } from "./reportes"

/** Conjunto de clientes de los microservicios. Las vistas solo dependen de esta interfaz. */
export interface Servicios {
  auth: AuthApi
  usuarios: UsuariosApi
  notificaciones: NotificacionesApi
  ingesta: IngestaApi
  datos: DatosApi
  plantillas: PlantillasApi
  reportes: ReportesApi
}

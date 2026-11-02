// MS Auditoría (Go) — base: /auditoria/v1
// Recibe eventos de todos los microservicios; el frontend solo consulta (administradores).
import type { Pagina, ParametrosPagina } from "./comunes"

export type TipoEvento =
  | "ingreso"
  | "usuario"
  | "importacion"
  | "deshacer"
  | "datos"
  | "reporte"
  | "configuracion"

export interface EventoAuditoria {
  id: string
  tipo: TipoEvento
  /** Acción en lenguaje claro, p. ej. «Importó 2 archivos». */
  accion: string
  detalle?: string
  usuarioId: string | null
  usuario: string
  creadoEn: string
}

export interface AuditoriaApi {
  /** GET /auditoria/v1/eventos?tipo=&pagina= → 200 Pagina<EventoAuditoria> | 403 (solo administradores) */
  listar(token: string, tipo: TipoEvento | null, p: ParametrosPagina): Promise<Pagina<EventoAuditoria>>
}

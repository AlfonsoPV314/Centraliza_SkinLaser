// Backend simulado del prototipo: implementa los contratos de los microservicios sobre IndexedDB.
import type { Servicios } from "@/contracts"
import { authMock } from "./auth"
import { datosMock } from "./datos"
import { ingestaMock } from "./ingesta"
import { notificacionesMock } from "./notificaciones"
import { plantillasMock } from "./plantillas"
import { reportesMock } from "./reportes"
import { usuariosMock } from "./usuarios"
import { asegurarSemilla } from "./seed"

export { suscribirMensajes } from "./notificaciones"
export { CUENTAS_DEMO, restablecerDemo } from "./seed"

export async function crearServiciosMock(): Promise<Servicios> {
  await asegurarSemilla()
  return {
    auth: authMock,
    usuarios: usuariosMock,
    notificaciones: notificacionesMock,
    ingesta: ingestaMock,
    datos: datosMock,
    plantillas: plantillasMock,
    reportes: reportesMock,
  }
}

import type { NotificacionesApi, Mensaje } from "@/contracts/notificaciones"
import { db } from "./db"
import { ahora, uid } from "./util"

type Oyente = (m: Mensaje) => void
const oyentes = new Set<Oyente>()
export const suscribirMensajes = (f: Oyente) => {
  oyentes.add(f)
  return () => oyentes.delete(f)
}

export async function enviarMensaje(
  m: Omit<Mensaje, "id" | "creadoEn" | "leido">,
): Promise<Mensaje> {
  const mensaje: Mensaje = {
    ...m,
    id: uid("m-"),
    creadoEn: ahora(),
    leido: false,
  }
  await db.mensajes.put(mensaje)
  oyentes.forEach((f) => f(mensaje))
  return mensaje
}

export const notificacionesMock: NotificacionesApi = {
  enviar: enviarMensaje,
  async listarSimulados() {
    return (await db.mensajes.orderBy("creadoEn").reverse().toArray()).slice(
      0,
      50,
    )
  },
  async marcarLeidos() {
    await db.mensajes.toCollection().modify({ leido: true })
  },
}

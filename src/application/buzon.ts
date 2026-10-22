// Puente al buzón de mensajes simulados (solo prototipo: en producción los mensajes llegan por correo/SMS/WhatsApp reales).
import { useEffect, useState } from "react"
import type { Mensaje } from "@/contracts"
import { useServicios } from "./servicios"

export function useBuzon() {
  const s = useServicios()
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [ultimo, setUltimo] = useState<Mensaje | null>(null)
  useEffect(() => {
    let vivo = true
    let desuscribir: (() => void) | undefined
    s.notificaciones.listarSimulados().then((m) => vivo && setMensajes(m))
    import("@/infrastructure/mock").then(({ suscribirMensajes }) => {
      if (!vivo) return
      const quitar = suscribirMensajes((m) => {
        setMensajes((l) => [m, ...l.filter((x) => x.id !== m.id)].slice(0, 50))
        setUltimo(m)
      })
      desuscribir = () => void quitar()
    })
    return () => {
      vivo = false
      desuscribir?.()
    }
  }, [s])
  const marcarLeidos = async () => {
    await s.notificaciones.marcarLeidos()
    setMensajes((l) => l.map((m) => ({ ...m, leido: true })))
  }
  return {
    mensajes,
    ultimo,
    noLeidos: mensajes.filter((m) => !m.leido).length,
    marcarLeidos,
  }
}

// Puente al buzón de mensajes simulados (solo prototipo: en producción los mensajes llegan por correo/SMS/WhatsApp reales).
import { computed, onScopeDispose, ref, shallowRef } from "vue"
import type { Mensaje } from "@/contracts"
import { useServicios } from "./servicios"

export function useBuzon() {
  const s = useServicios()
  const mensajes = ref<Mensaje[]>([])
  const ultimo = shallowRef<Mensaje | null>(null)
  let vivo = true
  let desuscribir: (() => void) | undefined
  s.notificaciones.listarSimulados().then((m) => vivo && (mensajes.value = m))
  import("@/infrastructure/mock").then(({ suscribirMensajes }) => {
    if (!vivo) return
    const quitar = suscribirMensajes((m) => {
      mensajes.value = [m, ...mensajes.value.filter((x) => x.id !== m.id)].slice(0, 50)
      ultimo.value = m
    })
    desuscribir = () => void quitar()
  })
  onScopeDispose(() => {
    vivo = false
    desuscribir?.()
  })
  const marcarLeidos = async () => {
    await s.notificaciones.marcarLeidos()
    mensajes.value = mensajes.value.map((m) => ({ ...m, leido: true }))
  }
  return {
    mensajes,
    ultimo,
    noLeidos: computed(() => mensajes.value.filter((m) => !m.leido).length),
    marcarLeidos,
  }
}

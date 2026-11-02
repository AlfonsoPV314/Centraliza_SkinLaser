import { shallowRef } from "vue"
import type { Servicios } from "@/contracts"

// Servicios del sistema (hoy simulados; mañana clientes HTTP de los microservicios Go).
const actual = shallowRef<Servicios | null>(null)

export function fijarServicios(s: Servicios) {
  actual.value = s
}

export function useServicios(): Servicios {
  if (!actual.value) throw new Error("Los servicios aún no están listos")
  return actual.value
}

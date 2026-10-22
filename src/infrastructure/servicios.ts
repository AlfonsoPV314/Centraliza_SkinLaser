// Punto único de creación de los clientes de microservicios.
// El prototipo usa el backend simulado; un cliente HTTP real implementaría la misma interfaz `Servicios`.
import type { Servicios } from "@/contracts"

let instancia: Promise<Servicios> | null = null

export function obtenerServicios(): Promise<Servicios> {
  instancia ??= import("./mock").then((m) => m.crearServiciosMock())
  return instancia
}

import { mensajeError } from "./errores"
import { useNotificar } from "./notificar"
import { useSesion } from "./sesion"

/** Notifica un error en lenguaje claro; si la sesión expiró, la cierra. */
export function useInformarError() {
  const notificar = useNotificar()
  const sesion = useSesion()
  return (e: unknown, titulo = "No se pudo completar la acción") => {
    if (sesion.manejarNoAutenticado(e)) return
    notificar({ tono: "peligro", titulo, detalle: mensajeError(e) })
  }
}

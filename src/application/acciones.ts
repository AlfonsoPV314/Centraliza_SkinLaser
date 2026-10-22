import { useCallback } from "react"
import { useNotificar } from "@/shared/ui"
import { mensajeError } from "./errores"
import { useSesion } from "./sesion"

/** Notifica un error en lenguaje claro; si la sesión expiró, la cierra. */
export function useInformarError() {
  const notificar = useNotificar()
  const { manejarNoAutenticado } = useSesion()
  return useCallback(
    (e: unknown, titulo = "No se pudo completar la acción") => {
      if (manejarNoAutenticado(e)) return
      notificar({ tono: "peligro", titulo, detalle: mensajeError(e) })
    },
    [notificar, manejarNoAutenticado],
  )
}

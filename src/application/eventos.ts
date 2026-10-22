// Aviso simple entre módulos: cuando una pantalla modifica datos, el shell (contadores, notificaciones) se refresca.
import { useEffect } from "react"

const oyentes = new Set<() => void>()

export function avisarCambioDatos() {
  oyentes.forEach((f) => f())
}

export function useCambiosDatos(f: () => void) {
  useEffect(() => {
    oyentes.add(f)
    return () => {
      oyentes.delete(f)
    }
  }, [f])
}

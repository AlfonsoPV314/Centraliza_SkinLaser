// Aviso simple entre módulos: cuando una pantalla modifica datos, el shell (contadores, notificaciones) se refresca.
import { onScopeDispose } from "vue"

const oyentes = new Set<() => void>()

export function avisarCambioDatos() {
  oyentes.forEach((f) => f())
}

export function useCambiosDatos(f: () => void) {
  oyentes.add(f)
  onScopeDispose(() => oyentes.delete(f))
}

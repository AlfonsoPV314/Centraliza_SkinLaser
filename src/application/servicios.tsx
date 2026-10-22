import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import type { Servicios } from "@/contracts"
import { obtenerServicios } from "@/infrastructure/servicios"
import { mensajeError } from "./errores"

const Contexto = createContext<Servicios | null>(null)

export function useServicios(): Servicios {
  const s = useContext(Contexto)
  if (!s)
    throw new Error("useServicios debe usarse dentro de ProveedorServicios")
  return s
}

export function ProveedorServicios({
  children,
  cargando,
  error,
}: {
  children: ReactNode
  cargando: ReactNode
  error: (mensaje: string, reintentar: () => void) => ReactNode
}) {
  const [estado, setEstado] = useState<{
    s: Servicios | null
    error: string | null
  }>({ s: null, error: null })
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    let vivo = true
    obtenerServicios()
      .then((s) => vivo && setEstado({ s, error: null }))
      .catch(
        (e) =>
          vivo &&
          setEstado({
            s: null,
            error: mensajeError(e, "No se pudo iniciar el sistema."),
          }),
      )
    return () => {
      vivo = false
    }
  }, [intento])
  if (estado.error)
    return (
      <>
        {error(
          estado.error,
          () => (setEstado({ s: null, error: null }), setIntento((i) => i + 1)),
        )}
      </>
    )
  if (!estado.s) return <>{cargando}</>
  return <Contexto.Provider value={estado.s}>{children}</Contexto.Provider>
}

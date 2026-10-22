import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"
import { ShieldAlert } from "lucide-react"
import { useSesion } from "@/application"
import { Boton, Vacio } from "@/shared/ui"
import { PantallaCarga } from "./estados"

export function RequiereSesion({ children }: { children: ReactNode }) {
  const { usuario, verificando } = useSesion()
  const loc = useLocation()
  if (verificando) return <PantallaCarga />
  if (!usuario) {
    const volver = loc.pathname + loc.search
    return (
      <Navigate
        to={
          volver && volver !== "/"
            ? `/ingresar?volver=${encodeURIComponent(volver)}`
            : "/ingresar"
        }
        replace
      />
    )
  }
  return <>{children}</>
}

export function RequiereAdmin({ children }: { children: ReactNode }) {
  const { usuario } = useSesion()
  if (usuario?.rol !== "administrador") {
    return (
      <Vacio
        icono={<ShieldAlert className="size-5" />}
        titulo="Esta sección es solo para administradores"
        accion={
          <Boton variante="primario" onClick={() => history.back()}>
            Volver
          </Boton>
        }
      >
        Si necesita gestionar usuarios, pida a un administrador del sistema que
        le asigne ese rol.
      </Vacio>
    )
  }
  return <>{children}</>
}

/** Pantallas de ingreso/registro: si ya hay sesión, se va al inicio (o a la ruta pedida). */
export function SoloPublico({ children }: { children: ReactNode }) {
  const { usuario, verificando } = useSesion()
  const loc = useLocation()
  if (verificando) return <PantallaCarga />
  if (usuario) {
    const volver = new URLSearchParams(loc.search).get("volver")
    return (
      <Navigate to={volver && volver.startsWith("/") ? volver : "/"} replace />
    )
  }
  return <>{children}</>
}

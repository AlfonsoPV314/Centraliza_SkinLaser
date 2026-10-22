import { isRouteErrorResponse, Link, useRouteError } from "react-router"
import { Compass, RotateCcw, TriangleAlert } from "lucide-react"
import { Boton, Vacio } from "@/shared/ui"
import { Isotipo } from "./Marca"

export function PantallaCarga({
  texto = "Preparando el sistema…",
}: {
  texto?: string
}) {
  return (
    <div
      className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4"
      role="status"
    >
      <Isotipo className="size-10 animate-pulse" />
      <p className="text-sm text-suave">{texto}</p>
    </div>
  )
}

export function PantallaError({
  mensaje,
  reintentar,
}: {
  mensaje: string
  reintentar?: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Vacio
        icono={<TriangleAlert className="size-5 text-peligro" />}
        titulo="No pudimos cargar el sistema"
        accion={
          reintentar && (
            <Boton
              variante="primario"
              icono={<RotateCcw className="size-4" />}
              onClick={reintentar}
            >
              Reintentar
            </Boton>
          )
        }
      >
        {mensaje}
      </Vacio>
    </div>
  )
}

export function ErrorRuta() {
  const e = useRouteError()
  if (isRouteErrorResponse(e) && e.status === 404) return <NoEncontrada />
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <Vacio
        icono={<TriangleAlert className="size-5 text-peligro" />}
        titulo="Esta pantalla tuvo un problema"
        accion={
          <div className="flex gap-2">
            <Boton
              onClick={() => location.reload()}
              icono={<RotateCcw className="size-4" />}
            >
              Recargar
            </Boton>
            <Link to="/">
              <Boton variante="primario">Ir al inicio</Boton>
            </Link>
          </div>
        }
      >
        Sus datos están a salvo. Recargue la página; si el problema continúa,
        avise al equipo de soporte indicando qué estaba haciendo.
      </Vacio>
    </div>
  )
}

export function NoEncontrada() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <Vacio
        icono={<Compass className="size-5" />}
        titulo="No encontramos esta página"
        accion={
          <Link to="/">
            <Boton variante="primario">Ir al inicio</Boton>
          </Link>
        }
      >
        Puede que el enlace esté incompleto o que la página haya cambiado de
        lugar.
      </Vacio>
    </div>
  )
}

import { Clock } from "lucide-react"
import { useSesion } from "@/application"
import { Boton, Dialogo } from "@/shared/ui"

export function AvisoInactividad() {
  const { aviso, seguirConectado, cerrar } = useSesion()
  return (
    <Dialogo
      abierto={aviso !== null}
      alCerrar={seguirConectado}
      cerrable={false}
      ancho="sm"
      titulo="¿Sigue ahí?"
      pie={
        <>
          <Boton variante="fantasma" onClick={() => cerrar("manual")}>
            Cerrar sesión
          </Boton>
          <Boton variante="primario" data-autofoco onClick={seguirConectado}>
            Seguir conectado
          </Boton>
        </>
      }
    >
      <div className="flex items-center gap-4">
        <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-aviso-tenue text-aviso">
          <Clock className="size-4" />
          <span className="num text-lg leading-none font-semibold">
            {aviso}
          </span>
        </div>
        <p className="text-sm text-suave">
          Por seguridad, su sesión se cerrará en{" "}
          <strong className="text-texto">{aviso} segundos</strong> por
          inactividad. Lo que no haya guardado podría perderse.
        </p>
      </div>
    </Dialogo>
  )
}

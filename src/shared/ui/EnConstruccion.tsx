import { Hammer } from "lucide-react"
import { EncabezadoPagina, Tarjeta, Vacio } from "./contenedores"

/** Marcador temporal para pantallas aún no implementadas. */
export function EnConstruccion({ titulo }: { titulo: string }) {
  return (
    <div className="animar-aparecer">
      <EncabezadoPagina titulo={titulo} />
      <Tarjeta relleno={false}>
        <Vacio
          icono={<Hammer className="size-5" />}
          titulo="Pantalla en construcción"
        >
          Esta sección todavía no está disponible en el prototipo.
        </Vacio>
      </Tarjeta>
    </div>
  )
}

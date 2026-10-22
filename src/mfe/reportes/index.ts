import { lazy } from "react"
import { FileChartColumn } from "lucide-react"
import type { ModuloFrontend } from "@/shell/modulos"

const Editor = lazy(() => import("./editor/EditorPlantilla"))

export const moduloReportes: ModuloFrontend = {
  id: "reportes",
  nombre: "Reportes",
  privadas: [
    { ruta: "/reportes", pagina: lazy(() => import("./Plantillas")) },
    { ruta: "/reportes/nueva", pagina: Editor },
    { ruta: "/reportes/:id/editar", pagina: Editor },
    {
      ruta: "/reportes/:id/generar",
      pagina: lazy(() => import("./generar/GenerarReporte")),
    },
  ],
  navegacion: [
    {
      ruta: "/reportes",
      etiqueta: "Reportes",
      icono: FileChartColumn,
      orden: 40,
    },
  ],
}

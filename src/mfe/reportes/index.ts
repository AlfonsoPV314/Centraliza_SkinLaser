import { FileChartColumn } from "@lucide/vue"
import type { ModuloFrontend } from "@/shell/modulos"

const Editor = () => import("./editor/EditorPlantilla.vue")

export const moduloReportes: ModuloFrontend = {
  id: "reportes",
  nombre: "Reportes",
  privadas: [
    { ruta: "/reportes", pagina: () => import("./Plantillas.vue") },
    { ruta: "/reportes/nueva", pagina: Editor },
    { ruta: "/reportes/:id/editar", pagina: Editor },
    {
      ruta: "/reportes/:id/generar",
      pagina: () => import("./generar/GenerarReporte.vue"),
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

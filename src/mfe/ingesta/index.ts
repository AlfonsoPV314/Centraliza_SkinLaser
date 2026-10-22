import { lazy } from "react"
import { Database, Upload } from "lucide-react"
import type { ModuloFrontend } from "@/shell/modulos"

export const moduloIngesta: ModuloFrontend = {
  id: "ingesta",
  nombre: "Carga y datos",
  privadas: [
    { ruta: "/cargar", pagina: lazy(() => import("./carga/CargarArchivos")) },
    { ruta: "/datos", pagina: lazy(() => import("./datos/GestionDatos")) },
  ],
  navegacion: [
    { ruta: "/cargar", etiqueta: "Cargar planillas", icono: Upload, orden: 20 },
    {
      ruta: "/datos",
      etiqueta: "Datos",
      icono: Database,
      orden: 30,
      contador: "pendientes",
    },
  ],
}

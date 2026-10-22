import { lazy } from "react"
import { LayoutDashboard } from "lucide-react"
import type { ModuloFrontend } from "@/shell/modulos"

export const moduloDashboard: ModuloFrontend = {
  id: "dashboard",
  nombre: "Inicio",
  privadas: [{ ruta: "/", pagina: lazy(() => import("./Inicio")) }],
  navegacion: [
    {
      ruta: "/",
      etiqueta: "Inicio",
      icono: LayoutDashboard,
      orden: 10,
      exacta: true,
    },
  ],
}

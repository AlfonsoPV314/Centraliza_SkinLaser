import { lazy } from "react"
import { Users } from "lucide-react"
import type { ModuloFrontend } from "@/shell/modulos"

export const moduloAdmin: ModuloFrontend = {
  id: "admin",
  nombre: "Administración",
  privadas: [
    {
      ruta: "/admin/usuarios",
      pagina: lazy(() => import("./Usuarios")),
      soloAdmin: true,
    },
  ],
  navegacion: [
    {
      ruta: "/admin/usuarios",
      etiqueta: "Usuarios y roles",
      icono: Users,
      orden: 90,
      soloAdmin: true,
    },
  ],
}

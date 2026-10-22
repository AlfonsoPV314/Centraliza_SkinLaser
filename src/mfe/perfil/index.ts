import { lazy } from "react"
import type { ModuloFrontend } from "@/shell/modulos"

export const moduloPerfil: ModuloFrontend = {
  id: "perfil",
  nombre: "Perfil",
  privadas: [{ ruta: "/perfil", pagina: lazy(() => import("./Perfil")) }],
}

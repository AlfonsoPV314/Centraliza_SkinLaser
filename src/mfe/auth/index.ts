import { lazy } from "react"
import type { ModuloFrontend } from "@/shell/modulos"

export const moduloAuth: ModuloFrontend = {
  id: "auth",
  nombre: "Acceso",
  publicas: [
    { ruta: "/ingresar", pagina: lazy(() => import("./Ingresar")) },
    { ruta: "/registro", pagina: lazy(() => import("./Registro")) },
    { ruta: "/recuperar", pagina: lazy(() => import("./Recuperar")) },
  ],
  abiertas: [
    { ruta: "/restablecer", pagina: lazy(() => import("./Restablecer")) },
  ],
  protegidasPublicas: [
    {
      ruta: "/cambiar-contrasena",
      pagina: lazy(() => import("./CambiarContrasena")),
    },
  ],
}

import { Users } from "@lucide/vue"
import type { ModuloFrontend } from "@/shell/modulos"

// MS Usuarios y Roles + MS Auditoría (pestaña «Actividad»).
export const moduloAdmin: ModuloFrontend = {
  id: "admin",
  nombre: "Administración",
  privadas: [{ ruta: "/admin/usuarios", pagina: () => import("./Usuarios.vue"), soloAdmin: true }],
  navegacion: [{ ruta: "/admin/usuarios", etiqueta: "Usuarios y roles", icono: Users, orden: 90, soloAdmin: true }],
}

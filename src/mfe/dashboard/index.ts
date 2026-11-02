import { LayoutDashboard } from "@lucide/vue"
import type { ModuloFrontend } from "@/shell/modulos"

export const moduloDashboard: ModuloFrontend = {
  id: "dashboard",
  nombre: "Inicio",
  privadas: [{ ruta: "/", pagina: () => import("./Inicio.vue") }],
  navegacion: [{ ruta: "/", etiqueta: "Inicio", icono: LayoutDashboard, orden: 10, exacta: true }],
}

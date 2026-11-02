import type { ModuloFrontend } from "@/shell/modulos"

export const moduloPerfil: ModuloFrontend = {
  id: "perfil",
  nombre: "Perfil",
  privadas: [{ ruta: "/perfil", pagina: () => import("./Perfil.vue") }],
}

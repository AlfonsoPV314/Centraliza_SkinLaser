import type { ModuloFrontend } from "@/shell/modulos"

// Sin autorregistro: las cuentas las crea un administrador (MS Usuarios y Roles).
export const moduloAuth: ModuloFrontend = {
  id: "auth",
  nombre: "Acceso",
  publicas: [
    { ruta: "/ingresar", pagina: () => import("./Ingresar.vue") },
    { ruta: "/recuperar", pagina: () => import("./Recuperar.vue") },
  ],
  abiertas: [{ ruta: "/restablecer", pagina: () => import("./Restablecer.vue") }],
  protegidasPublicas: [{ ruta: "/cambiar-contrasena", pagina: () => import("./CambiarContrasena.vue") }],
}

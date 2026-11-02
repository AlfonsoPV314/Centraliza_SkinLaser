import { Database, Upload } from "@lucide/vue"
import type { ModuloFrontend } from "@/shell/modulos"

export const moduloIngesta: ModuloFrontend = {
  id: "ingesta",
  nombre: "Carga y datos",
  privadas: [
    { ruta: "/cargar", pagina: () => import("./carga/CargarArchivos.vue") },
    { ruta: "/datos", pagina: () => import("./datos/GestionDatos.vue") },
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

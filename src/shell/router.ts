import { createRouter, createWebHashHistory, type RouteRecordRaw } from "vue-router"
import { sesionLista, useSesion } from "@/application"
import { moduloAdmin } from "@/mfe/admin"
import { moduloAuth } from "@/mfe/auth"
import { moduloDashboard } from "@/mfe/dashboard"
import { moduloIngesta } from "@/mfe/ingesta"
import { moduloPerfil } from "@/mfe/perfil"
import { moduloReportes } from "@/mfe/reportes"
import type { Acceso, ModuloFrontend, RutaModulo } from "./modulos"

declare module "vue-router" {
  interface RouteMeta {
    acceso?: Acceso
    soloAdmin?: boolean
  }
}

export const MODULOS: ModuloFrontend[] = [
  moduloAuth,
  moduloDashboard,
  moduloIngesta,
  moduloReportes,
  moduloPerfil,
  moduloAdmin,
]

export const NAVEGACION = MODULOS.flatMap((m) => m.navegacion ?? [])

const aRutas = (lista: (m: ModuloFrontend) => RutaModulo[] | undefined, acceso: Acceso): RouteRecordRaw[] =>
  MODULOS.flatMap((m) => lista(m) ?? []).map(({ ruta, pagina, soloAdmin }) => ({
    path: ruta,
    component: pagina,
    meta: { acceso, soloAdmin },
  }))

/** Rutas que se muestran con el diseño público (sin barra lateral). */
export const esDisenoPublico = (a: Acceso | undefined) => a !== "privada"

export function crearRouter() {
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [
      ...aRutas((m) => m.publicas, "publica"),
      ...aRutas((m) => m.abiertas, "abierta"),
      ...aRutas((m) => m.protegidasPublicas, "protegida"),
      ...aRutas((m) => m.privadas, "privada"),
      // Compatibilidad: el autorregistro ya no existe; las cuentas las crea un administrador.
      { path: "/registro", redirect: "/ingresar" },
      { path: "/:resto(.*)*", component: () => import("./NoEncontrada.vue"), meta: { acceso: "privada" } },
    ],
    scrollBehavior: () => ({ top: 0 }),
  })
  router.beforeEach(async (to) => {
    await sesionLista
    const usuario = useSesion().usuario.value
    const acceso = to.meta.acceso
    if (acceso === "publica" && usuario) {
      const volver = to.query.volver
      return typeof volver === "string" && volver.startsWith("/") ? volver : "/"
    }
    if ((acceso === "privada" || acceso === "protegida") && !usuario)
      return { path: "/ingresar", query: to.fullPath !== "/" ? { volver: to.fullPath } : {} }
  })
  return router
}

import type { RouteObject } from "react-router"
import { createHashRouter } from "react-router"
import { moduloAdmin } from "@/mfe/admin"
import { moduloAuth } from "@/mfe/auth"
import { moduloDashboard } from "@/mfe/dashboard"
import { moduloIngesta } from "@/mfe/ingesta"
import { moduloPerfil } from "@/mfe/perfil"
import { moduloReportes } from "@/mfe/reportes"
import { ErrorRuta, NoEncontrada } from "./estados"
import { RequiereAdmin, RequiereSesion, SoloPublico } from "./guards"
import { LayoutPrivado } from "./LayoutPrivado"
import { LayoutPublico } from "./LayoutPublico"
import type { ModuloFrontend, RutaModulo } from "./modulos"

export const MODULOS: ModuloFrontend[] = [
  moduloAuth,
  moduloDashboard,
  moduloIngesta,
  moduloReportes,
  moduloPerfil,
  moduloAdmin,
]

const aRutas = (
  lista: (m: ModuloFrontend) => RutaModulo[] | undefined,
): RouteObject[] =>
  MODULOS.flatMap((m) => lista(m) ?? []).map(
    ({ ruta, pagina: Pagina, soloAdmin }) => ({
      path: ruta,
      element: soloAdmin ? (
        <RequiereAdmin>
          <Pagina />
        </RequiereAdmin>
      ) : (
        <Pagina />
      ),
    }),
  )

export function crearRouter() {
  const navegacion = MODULOS.flatMap((m) => m.navegacion ?? [])
  return createHashRouter([
    {
      errorElement: <ErrorRuta />,
      children: [
        {
          element: (
            <SoloPublico>
              <LayoutPublico />
            </SoloPublico>
          ),
          children: aRutas((m) => m.publicas),
        },
        { element: <LayoutPublico />, children: aRutas((m) => m.abiertas) },
        {
          element: (
            <RequiereSesion>
              <LayoutPublico />
            </RequiereSesion>
          ),
          children: aRutas((m) => m.protegidasPublicas),
        },
        {
          element: (
            <RequiereSesion>
              <LayoutPrivado navegacion={navegacion} />
            </RequiereSesion>
          ),
          children: [
            {
              errorElement: <ErrorRuta />,
              children: [
                ...aRutas((m) => m.privadas),
                { path: "*", element: <NoEncontrada /> },
              ],
            },
          ],
        },
      ],
    },
  ])
}

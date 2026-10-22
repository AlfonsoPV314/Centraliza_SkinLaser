import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router"
import {
  Bell,
  ChevronsUpDown,
  CircleUser,
  FlaskConical,
  LogOut,
  Menu,
  Moon,
  Sun,
  TriangleAlert,
  Upload,
  UserRoundCog,
  Users,
  X,
} from "lucide-react"
import type { EstadoDatos, Importacion } from "@/contracts"
import { useCambiosDatos, useServicios, useSesion } from "@/application"
import { formatearMarcaTiempo } from "@/domain/dates"
import { plural } from "@/domain/format"
import { useClickFuera } from "@/shared/hooks"
import { Esqueleto, Insignia, cn } from "@/shared/ui"
import { AvisoInactividad } from "./AvisoInactividad"
import { BuzonSimulado } from "./BuzonSimulado"
import { MARCA } from "@/config/brand"
import { LogoCliente, Marca } from "./Marca"
import type { EntradaNavegacion } from "./modulos"

function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("")
}

function Navegacion({
  entradas,
  pendientes,
  alNavegar,
}: {
  entradas: EntradaNavegacion[]
  pendientes: number
  alNavegar?: () => void
}) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Principal">
      {entradas.map((e) => (
        <NavLink
          key={e.ruta}
          to={e.ruta}
          end={e.exacta}
          onClick={alNavegar}
          className={({ isActive }) =>
            cn(
              "group flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              isActive
                ? "bg-acento-tenue text-acento"
                : "text-suave hover:bg-superficie-2 hover:text-texto",
            )
          }
        >
          <e.icono className="size-[18px] shrink-0" />
          <span className="flex-1">{e.etiqueta}</span>
          {e.contador === "pendientes" && pendientes > 0 && (
            <span className="num rounded-full bg-aviso-tenue px-1.5 text-[11px] leading-[18px] font-semibold text-aviso">
              {pendientes}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function Notificaciones({
  estado,
  importaciones,
}: {
  estado: EstadoDatos | null
  importaciones: Importacion[]
}) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const cerrar = useCallback(() => setAbierto(false), [])
  useClickFuera(ref, cerrar, abierto)
  const items: {
    titulo: string
    detalle: string
    ruta: string
    tono: "peligro" | "aviso" | "info"
  }[] = []
  if (estado?.filasConError)
    items.push({
      titulo: `${plural(estado.filasConError, "fila")} con errores`,
      detalle: "No se guardaron. Corríjalas para incluirlas en los reportes.",
      ruta: "/datos?pestana=errores",
      tono: "peligro",
    })
  if (estado?.duplicadosPendientes)
    items.push({
      titulo: `${plural(estado.duplicadosPendientes, "posible duplicado", "posibles duplicados")} por decidir`,
      detalle: "Elija qué versión conservar.",
      ruta: "/datos?pestana=duplicados",
      tono: "aviso",
    })
  if (estado?.pacientesIncompletos)
    items.push({
      titulo: `${plural(estado.pacientesIncompletos, "paciente")} con datos incompletos`,
      detalle: "Faltan atributos base como previsión o dirección.",
      ruta: "/datos?pestana=incompletos",
      tono: "info",
    })
  const total =
    (estado?.filasConError ?? 0) + (estado?.duplicadosPendientes ?? 0)
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="relative flex size-9 items-center justify-center rounded-lg text-suave hover:bg-superficie-2 hover:text-texto"
        aria-label={`Notificaciones${total ? `, ${total} pendientes` : ""}`}
        aria-expanded={abierto}
      >
        <Bell className="size-[18px]" />
        {total > 0 && (
          <span className="absolute top-2 right-2 size-2 rounded-full bg-aviso ring-2 ring-fondo" />
        )}
      </button>
      {abierto && (
        <div className="animar-aparecer absolute right-0 z-40 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-borde bg-superficie-2 shadow-2xl">
          <p className="border-b border-borde px-4 py-3 text-sm font-semibold">
            Pendientes
          </p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-suave">
              Todo al día. No hay filas por revisar.
            </p>
          ) : (
            <ul className="p-1.5">
              {items.map((i) => (
                <li key={i.ruta}>
                  <Link
                    to={i.ruta}
                    onClick={cerrar}
                    className="flex gap-3 rounded-lg p-2.5 hover:bg-superficie-3"
                  >
                    <TriangleAlert
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        i.tono === "peligro"
                          ? "text-peligro"
                          : i.tono === "aviso"
                            ? "text-aviso"
                            : "text-info",
                      )}
                    />
                    <span>
                      <span className="block text-[13.5px] font-medium">
                        {i.titulo}
                      </span>
                      <span className="block text-[12.5px] text-suave">
                        {i.detalle}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {importaciones.length > 0 && (
            <>
              <p className="border-t border-borde px-4 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-tenue uppercase">
                Últimas cargas
              </p>
              <ul className="px-1.5 pb-1.5">
                {importaciones.slice(0, 3).map((imp) => (
                  <li key={imp.id}>
                    <Link
                      to="/datos?pestana=historial"
                      onClick={cerrar}
                      className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-superficie-3"
                    >
                      <Upload className="size-4 shrink-0 text-tenue" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px]">
                          {imp.archivos.map((a) => a.nombre).join(", ")}
                        </span>
                        <span className="block text-[12px] text-tenue">
                          {formatearMarcaTiempo(imp.creadaEn)} · {imp.usuario}
                        </span>
                      </span>
                      {imp.estado === "deshecha" && (
                        <Insignia>Deshecha</Insignia>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MenuUsuario() {
  const { usuario, cerrar, guardarPreferencias } = useSesion()
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const ocultar = useCallback(() => setAbierto(false), [])
  useClickFuera(ref, ocultar, abierto)
  const navegar = useNavigate()
  if (!usuario) return null
  const tema = usuario.preferencias.tema
  const item =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] hover:bg-superficie-3"
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-lg pr-2 pl-1 hover:bg-superficie-2"
        aria-expanded={abierto}
        aria-haspopup="menu"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-acento-tenue text-[11px] font-semibold text-acento">
          {iniciales(usuario.nombreUsuario)}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-[13px] font-medium">
            {usuario.nombreUsuario}
          </span>
          <span className="block text-[11px] text-tenue">
            {usuario.rol === "administrador" ? "Administrador" : "Usuario"}
          </span>
        </span>
        <ChevronsUpDown className="size-3.5 text-tenue" />
      </button>
      {abierto && (
        <div
          role="menu"
          className="animar-aparecer absolute right-0 z-40 mt-2 w-64 rounded-xl border border-borde bg-superficie-2 p-1.5 shadow-2xl"
        >
          <div className="border-b border-borde px-2.5 pt-1.5 pb-2.5">
            <p className="text-sm font-medium">{usuario.nombreUsuario}</p>
            <p className="truncate text-[12.5px] text-tenue">
              {usuario.correo}
            </p>
          </div>
          <div className="pt-1.5">
            <button
              role="menuitem"
              className={item}
              onClick={() => (navegar("/perfil"), ocultar())}
            >
              <CircleUser className="size-4 text-tenue" /> Mi perfil
            </button>
            {usuario.rol === "administrador" && (
              <button
                role="menuitem"
                className={item}
                onClick={() => (navegar("/admin/usuarios"), ocultar())}
              >
                <Users className="size-4 text-tenue" /> Usuarios y roles
              </button>
            )}
            <button
              role="menuitem"
              className={item}
              onClick={() =>
                guardarPreferencias({
                  tema: tema === "oscuro" ? "claro" : "oscuro",
                })
              }
            >
              {tema === "oscuro" ? (
                <Sun className="size-4 text-tenue" />
              ) : (
                <Moon className="size-4 text-tenue" />
              )}
              {tema === "oscuro" ? "Usar tema claro" : "Usar tema oscuro"}
            </button>
            <div className="my-1 border-t border-borde" />
            <button
              role="menuitem"
              className={cn(item, "text-peligro")}
              onClick={() => cerrar("manual")}
            >
              <LogOut className="size-4" /> Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CargaPagina() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="space-y-2">
        <Esqueleto className="h-7 w-64" />
        <Esqueleto className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Esqueleto key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Esqueleto className="h-72 rounded-xl" />
    </div>
  )
}

export function LayoutPrivado({
  navegacion,
}: {
  navegacion: EntradaNavegacion[]
}) {
  const s = useServicios()
  const { usuario, token } = useSesion()
  const [menuMovil, setMenuMovil] = useState(false)
  const [estado, setEstado] = useState<EstadoDatos | null>(null)
  const [importaciones, setImportaciones] = useState<Importacion[]>([])
  const loc = useLocation()
  const principal = useRef<HTMLElement>(null)

  const refrescar = useCallback(() => {
    if (!token) return
    s.datos
      .estado(token)
      .then(setEstado)
      .catch(() => {})
    s.ingesta
      .listar(token, 5)
      .then(setImportaciones)
      .catch(() => {})
  }, [s, token])
  useEffect(refrescar, [refrescar])
  useCambiosDatos(refrescar)

  useEffect(() => {
    setMenuMovil(false)
    principal.current?.scrollTo?.({ top: 0 })
  }, [loc.pathname])

  const entradas = navegacion
    .filter((e) => !e.soloAdmin || usuario?.rol === "administrador")
    .sort((a, b) => a.orden - b.orden)
  const pendientes =
    (estado?.filasConError ?? 0) + (estado?.duplicadosPendientes ?? 0)

  const lateral = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-4">
        <Link to="/" aria-label="Ir al inicio">
          <Marca />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-tenue uppercase">
          Trabajo
        </p>
        <Navegacion
          entradas={entradas.filter((e) => !e.soloAdmin)}
          pendientes={pendientes}
          alNavegar={() => setMenuMovil(false)}
        />
        {entradas.some((e) => e.soloAdmin) && (
          <>
            <p className="px-3 pt-6 pb-2 text-[11px] font-semibold tracking-wider text-tenue uppercase">
              Administración
            </p>
            <Navegacion
              entradas={entradas.filter((e) => e.soloAdmin)}
              pendientes={0}
              alNavegar={() => setMenuMovil(false)}
            />
          </>
        )}
      </div>
      <div className="border-t border-borde p-3">
        <NavLink
          to="/perfil"
          className={({ isActive }) =>
            cn(
              "flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium",
              isActive
                ? "bg-acento-tenue text-acento"
                : "text-suave hover:bg-superficie-2 hover:text-texto",
            )
          }
        >
          <UserRoundCog className="size-[18px]" /> Mi perfil y preferencias
        </NavLink>
        <div className="mt-3 flex items-center gap-2.5 px-2">
          <LogoCliente className="size-8" />
          <p className="text-[11px] leading-tight text-tenue">
            {MARCA.cliente}
            <span className="block">{MARCA.descripcionCliente}</span>
          </p>
        </div>
        {estado && (
          <div className="mt-3 rounded-lg bg-superficie-2 px-3 py-2.5 text-[12px] text-suave">
            <p className="num font-medium text-texto">
              {plural(estado.filas, "fila")} ·{" "}
              {plural(estado.pacientes, "paciente")}
            </p>
            <p className="mt-0.5">
              {estado.ultimaCarga
                ? `Última carga: ${formatearMarcaTiempo(estado.ultimaCarga)}`
                : "Aún no hay cargas"}
            </p>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen lg:pl-64">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-acento focus:px-3 focus:py-2 focus:text-sobre-acento"
      >
        Saltar al contenido
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-borde bg-superficie lg:block">
        {lateral}
      </aside>
      {menuMovil && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuMovil(false)}
            aria-hidden
          />
          <aside className="animar-deslizar absolute inset-y-0 left-0 w-72 border-r border-borde bg-superficie">
            <button
              onClick={() => setMenuMovil(false)}
              className="absolute top-4 right-3 flex size-8 items-center justify-center rounded-md text-tenue hover:bg-superficie-2"
              aria-label="Cerrar menú"
            >
              <X className="size-4" />
            </button>
            {lateral}
          </aside>
        </div>
      )}
      <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-borde bg-fondo/85 px-4 backdrop-blur-md sm:px-6">
        <button
          onClick={() => setMenuMovil(true)}
          className="flex size-9 items-center justify-center rounded-lg text-suave hover:bg-superficie-2 lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="size-5" />
        </button>
        <Link to="/" className="lg:hidden">
          <Marca compacta />
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <Insignia
            tono="aviso"
            className="mr-2 hidden md:inline-flex"
            icono={<FlaskConical className="size-3" />}
          >
            Prototipo
          </Insignia>
          <BuzonSimulado variante="barra" />
          <Notificaciones estado={estado} importaciones={importaciones} />
          <div className="mx-1 h-6 w-px bg-borde" />
          <MenuUsuario />
        </div>
      </header>
      <main
        id="contenido"
        ref={principal}
        className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
      >
        <Suspense fallback={<CargaPagina />}>
          <Outlet />
        </Suspense>
      </main>
      <AvisoInactividad />
    </div>
  )
}

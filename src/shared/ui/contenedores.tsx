import type { HTMLAttributes, ReactNode } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  LoaderCircle,
  OctagonAlert,
} from "lucide-react"
import { cn } from "./cn"

export function Tarjeta({
  className,
  children,
  relleno = true,
  ...p
}: HTMLAttributes<HTMLDivElement> & { relleno?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-borde bg-superficie shadow-panel",
        relleno && "p-5",
        className,
      )}
      {...p}
    >
      {children}
    </div>
  )
}

export function EncabezadoTarjeta({
  titulo,
  descripcion,
  accion,
  icono,
  className,
}: {
  titulo: ReactNode
  descripcion?: ReactNode
  accion?: ReactNode
  icono?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn("mb-4 flex items-start justify-between gap-4", className)}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icono && (
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-acento-tenue text-acento">
            {icono}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight">{titulo}</h2>
          {descripcion && (
            <p className="mt-0.5 text-[13px] text-suave">{descripcion}</p>
          )}
        </div>
      </div>
      {accion && (
        <div className="flex shrink-0 items-center gap-2">{accion}</div>
      )}
    </div>
  )
}

export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
  migas,
}: {
  titulo: ReactNode
  descripcion?: ReactNode
  acciones?: ReactNode
  migas?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-3xl">
        {migas && <div className="mb-2 text-[13px] text-tenue">{migas}</div>}
        <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-balance">
          {titulo}
        </h1>
        {descripcion && (
          <p className="mt-1.5 text-sm text-suave text-pretty">{descripcion}</p>
        )}
      </div>
      {acciones && (
        <div className="flex flex-wrap items-center gap-2">{acciones}</div>
      )}
    </header>
  )
}

type Tono = "neutro" | "acento" | "peligro" | "aviso" | "exito" | "info"
const TONOS: Record<Tono, string> = {
  neutro: "bg-superficie-3 text-suave",
  acento: "bg-acento-tenue text-acento",
  peligro: "bg-peligro-tenue text-peligro",
  aviso: "bg-aviso-tenue text-aviso",
  exito: "bg-exito-tenue text-exito",
  info: "bg-info-tenue text-info",
}

export function Insignia({
  tono = "neutro",
  children,
  className,
  icono,
}: {
  tono?: Tono
  children: ReactNode
  className?: string
  icono?: ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11.5px] font-medium whitespace-nowrap",
        TONOS[tono],
        className,
      )}
    >
      {icono}
      {children}
    </span>
  )
}

const ICONO_AVISO = {
  info: Info,
  aviso: AlertTriangle,
  peligro: OctagonAlert,
  exito: CheckCircle2,
}

export function Aviso({
  tono = "info",
  titulo,
  children,
  accion,
  className,
}: {
  tono?: "info" | "aviso" | "peligro" | "exito"
  titulo?: ReactNode
  children?: ReactNode
  accion?: ReactNode
  className?: string
}) {
  const Icono = ICONO_AVISO[tono]
  const borde = {
    info: "border-info/25",
    aviso: "border-aviso/30",
    peligro: "border-peligro/30",
    exito: "border-exito/30",
  }[tono]
  return (
    <div
      role={tono === "peligro" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-lg border px-3.5 py-3 text-[13.5px]",
        TONOS[tono],
        borde,
        className,
      )}
    >
      <Icono className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-texto">
        {titulo && <p className="font-medium">{titulo}</p>}
        {children && (
          <div className={cn("text-suave", titulo && "mt-0.5")}>{children}</div>
        )}
      </div>
      {accion && <div className="shrink-0 self-center">{accion}</div>}
    </div>
  )
}

export function Vacio({
  icono,
  titulo,
  children,
  accion,
  className,
}: {
  icono?: ReactNode
  titulo: ReactNode
  children?: ReactNode
  accion?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      {icono && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl border border-borde bg-superficie-2 text-tenue">
          {icono}
        </div>
      )}
      <p className="font-medium">{titulo}</p>
      {children && (
        <div className="mt-1 max-w-md text-[13.5px] text-suave text-pretty">
          {children}
        </div>
      )}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  )
}

export function Esqueleto({ className }: { className?: string }) {
  return <div className={cn("esqueleto rounded-md", className)} aria-hidden />
}

export function Cargando({
  texto = "Cargando…",
  className,
}: {
  texto?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 py-10 text-sm text-suave",
        className,
      )}
      role="status"
    >
      <LoaderCircle className="size-4 animate-spin text-acento" aria-hidden />
      {texto}
    </div>
  )
}

export function Pestanas<T extends string>({
  valor,
  pestanas,
  alCambiar,
  className,
}: {
  valor: T
  pestanas: {
    valor: T
    etiqueta: ReactNode
    contador?: number
    icono?: ReactNode
  }[]
  alCambiar: (v: T) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex gap-1 overflow-x-auto border-b border-borde",
        className,
      )}
    >
      {pestanas.map((p) => {
        const activa = p.valor === valor
        return (
          <button
            key={p.valor}
            role="tab"
            aria-selected={activa}
            onClick={() => alCambiar(p.valor)}
            className={cn(
              "relative -mb-px flex h-10 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors",
              activa
                ? "border-acento text-texto"
                : "border-transparent text-suave hover:text-texto",
            )}
          >
            {p.icono}
            {p.etiqueta}
            {p.contador !== undefined && p.contador > 0 && (
              <span
                className={cn(
                  "num rounded-full px-1.5 text-[11px] leading-[18px]",
                  activa
                    ? "bg-acento text-sobre-acento"
                    : "bg-superficie-3 text-suave",
                )}
              >
                {p.contador.toLocaleString("es-CL")}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function Paginacion({
  pagina,
  total,
  porPagina,
  alCambiar,
  className,
}: {
  pagina: number
  total: number
  porPagina: number
  alCambiar: (p: number) => void
  className?: string
}) {
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  if (total === 0) return null
  const desde = (pagina - 1) * porPagina + 1
  const hasta = Math.min(total, pagina * porPagina)
  const numeros: (number | "…")[] = []
  for (let i = 1; i <= paginas; i++) {
    if (i === 1 || i === paginas || Math.abs(i - pagina) <= 1) numeros.push(i)
    else if (numeros[numeros.length - 1] !== "…") numeros.push("…")
  }
  return (
    <nav
      aria-label="Paginación"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 text-[13px] text-suave",
        className,
      )}
    >
      <span className="num">
        {desde.toLocaleString("es-CL")}–{hasta.toLocaleString("es-CL")} de{" "}
        {total.toLocaleString("es-CL")}
      </span>
      {paginas > 1 && (
        <div className="flex items-center gap-1">
          <button
            className="flex size-8 items-center justify-center rounded-md hover:bg-superficie-2 disabled:opacity-40"
            disabled={pagina <= 1}
            onClick={() => alCambiar(pagina - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          {numeros.map((n, i) =>
            n === "…" ? (
              <span key={`e${i}`} className="px-1 text-tenue">
                …
              </span>
            ) : (
              <button
                key={n}
                onClick={() => alCambiar(n)}
                aria-current={n === pagina ? "page" : undefined}
                className={cn(
                  "num h-8 min-w-8 rounded-md px-2 font-medium",
                  n === pagina
                    ? "bg-acento-tenue text-acento"
                    : "hover:bg-superficie-2",
                )}
              >
                {n}
              </button>
            ),
          )}
          <button
            className="flex size-8 items-center justify-center rounded-md hover:bg-superficie-2 disabled:opacity-40"
            disabled={pagina >= paginas}
            onClick={() => alCambiar(pagina + 1)}
            aria-label="Página siguiente"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </nav>
  )
}

export function Dato({
  etiqueta,
  valor,
  detalle,
  tono,
  icono,
}: {
  etiqueta: ReactNode
  valor: ReactNode
  detalle?: ReactNode
  tono?: "acento" | "peligro" | "aviso" | "exito"
  icono?: ReactNode
}) {
  const color = tono
    ? {
        acento: "text-acento",
        peligro: "text-peligro",
        aviso: "text-aviso",
        exito: "text-exito",
      }[tono]
    : "text-texto"
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-[12.5px] font-medium tracking-wide text-tenue uppercase">
        {icono}
        {etiqueta}
      </span>
      <span
        className={cn(
          "num text-[26px] leading-none font-semibold tracking-tight",
          color,
        )}
      >
        {valor}
      </span>
      {detalle && <span className="text-[12.5px] text-suave">{detalle}</span>}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-borde bg-superficie-2 px-1.5 py-px font-mono text-[11px] text-suave">
      {children}
    </kbd>
  )
}

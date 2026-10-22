import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react"
import { Check, ChevronDown, Eye, EyeOff, X } from "lucide-react"
import { REQUISITOS_CONTRASENA, requisitosContrasena } from "@/domain/password"
import { cn } from "./cn"

const BASE_CONTROL =
  "w-full rounded-lg border bg-superficie px-3 text-sm text-texto placeholder:text-tenue transition-colors outline-none focus:border-acento focus:ring-3 focus:ring-acento/15 disabled:opacity-60 disabled:cursor-not-allowed"

export function Campo({
  etiqueta,
  ayuda,
  error,
  children,
  opcional,
  className,
  htmlFor,
  accion,
}: {
  etiqueta?: ReactNode
  ayuda?: ReactNode
  error?: string | null
  children: ReactNode
  opcional?: boolean
  className?: string
  htmlFor?: string
  accion?: ReactNode
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(etiqueta || accion) && (
        <div className="flex items-baseline justify-between gap-2">
          {etiqueta && (
            <label
              htmlFor={htmlFor}
              className="text-[13px] font-medium text-texto"
            >
              {etiqueta}
              {opcional && (
                <span className="ml-1.5 font-normal text-tenue">
                  (opcional)
                </span>
              )}
            </label>
          )}
          {accion}
        </div>
      )}
      {children}
      {error ? (
        <p className="text-[12.5px] leading-snug text-peligro" role="alert">
          {error}
        </p>
      ) : ayuda ? (
        <p className="text-[12.5px] leading-snug text-tenue">{ayuda}</p>
      ) : null}
    </div>
  )
}

export const Entrada =
  forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & {
    invalido?: boolean
    prefijo?: ReactNode
    sufijo?: ReactNode
  }>(function Entrada({ className, invalido, prefijo, sufijo, ...p }, ref) {
    if (prefijo || sufijo) {
      return (
        <div className={cn("relative flex items-center", className)}>
          {prefijo && (
            <span className="pointer-events-none absolute left-3 flex text-tenue">
              {prefijo}
            </span>
          )}
          <input
            ref={ref}
            aria-invalid={invalido || undefined}
            className={cn(
              BASE_CONTROL,
              "h-9",
              prefijo && "pl-9",
              sufijo && "pr-10",
              invalido ? "border-peligro" : "border-borde",
            )}
            {...p}
          />
          {sufijo && <span className="absolute right-1.5 flex">{sufijo}</span>}
        </div>
      )
    }
    return (
      <input
        ref={ref}
        aria-invalid={invalido || undefined}
        className={cn(
          BASE_CONTROL,
          "h-9",
          invalido ? "border-peligro" : "border-borde",
          className,
        )}
        {...p}
      />
    )
  })

export const AreaTexto =
  forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & {
    invalido?: boolean
  }>(function AreaTexto({ className, invalido, ...p }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          BASE_CONTROL,
          "min-h-20 py-2 leading-relaxed",
          invalido ? "border-peligro" : "border-borde",
          className,
        )}
        {...p}
      />
    )
  })

export const Selector =
  forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & {
    invalido?: boolean
    tamano?: "sm" | "md"
  }>(function Selector(
    { className, invalido, children, tamano = "md", ...p },
    ref,
  ) {
    return (
      <div className={cn("relative", className)}>
        <select
          ref={ref}
          className={cn(
            BASE_CONTROL,
            "appearance-none pr-8",
            tamano === "sm" ? "h-8 text-[13px]" : "h-9",
            invalido ? "border-peligro" : "border-borde",
          )}
          {...p}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-tenue"
          aria-hidden
        />
      </div>
    )
  })

export function Casilla({
  marcada,
  alCambiar,
  children,
  indeterminada,
  deshabilitada,
  className,
  descripcion,
}: {
  marcada: boolean
  alCambiar: (v: boolean) => void
  children?: ReactNode
  indeterminada?: boolean
  deshabilitada?: boolean
  className?: string
  descripcion?: ReactNode
}) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className={cn(
        "group inline-flex cursor-pointer items-start gap-2.5 text-sm select-none",
        deshabilitada && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <span className="relative mt-0.5 flex">
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={marcada}
          disabled={deshabilitada}
          ref={(el) => {
            if (el) el.indeterminate = !!indeterminada
          }}
          onChange={(e) => alCambiar(e.target.checked)}
        />
        <span
          className={cn(
            "flex size-4 items-center justify-center rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-acento",
            marcada || indeterminada
              ? "border-acento bg-acento text-sobre-acento"
              : "border-borde-fuerte bg-superficie group-hover:border-acento",
          )}
        >
          {indeterminada ? (
            <span className="h-0.5 w-2 rounded bg-current" />
          ) : marcada ? (
            <Check className="size-3" strokeWidth={3} />
          ) : null}
        </span>
      </span>
      {(children || descripcion) && (
        <span className="flex flex-col">
          {children && <span className="leading-snug">{children}</span>}
          {descripcion && (
            <span className="text-[12.5px] text-tenue">{descripcion}</span>
          )}
        </span>
      )}
    </label>
  )
}

export function Interruptor({
  activo,
  alCambiar,
  etiqueta,
  descripcion,
  deshabilitado,
}: {
  activo: boolean
  alCambiar: (v: boolean) => void
  etiqueta: ReactNode
  descripcion?: ReactNode
  deshabilitado?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      disabled={deshabilitado}
      onClick={() => alCambiar(!activo)}
      className="flex w-full items-start justify-between gap-4 text-left disabled:opacity-50"
    >
      <span className="flex flex-col">
        <span className="text-sm font-medium">{etiqueta}</span>
        {descripcion && (
          <span className="text-[12.5px] text-tenue">{descripcion}</span>
        )}
      </span>
      <span
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors",
          activo ? "bg-acento" : "bg-superficie-3 ring-1 ring-borde-fuerte",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform",
            activo ? "translate-x-4.5" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  )
}

export function Segmentado<T extends string>({
  valor,
  opciones,
  alCambiar,
  tamano = "md",
  etiqueta,
  className,
}: {
  valor: T
  opciones: { valor: T; etiqueta: ReactNode; icono?: ReactNode; titulo?: string }[]
  alCambiar: (v: T) => void
  tamano?: "sm" | "md"
  etiqueta?: string
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className={cn(
        "inline-flex rounded-lg border border-borde bg-superficie-2 p-0.5",
        className,
      )}
    >
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          title={o.titulo}
          onClick={() => alCambiar(o.valor)}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors",
            tamano === "sm"
              ? "h-7 px-2.5 text-[12.5px]"
              : "h-8 px-3 text-[13px]",
            valor === o.valor
              ? "bg-superficie text-texto shadow-sm ring-1 ring-borde"
              : "text-suave hover:text-texto",
          )}
        >
          {o.icono}
          {o.etiqueta}
        </button>
      ))}
    </div>
  )
}

export const CampoContrasena =
  forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & {
    invalido?: boolean
  }>(function CampoContrasena(p, ref) {
    const [visible, setVisible] = useState(false)
    return (
      <Entrada
        ref={ref}
        {...p}
        type={visible ? "text" : "password"}
        sufijo={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="flex size-7 items-center justify-center rounded-md text-tenue hover:text-texto"
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {visible ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        }
      />
    )
  })

export function ListaRequisitos({ contrasena }: { contrasena: string }) {
  const r = requisitosContrasena(contrasena)
  return (
    <ul
      className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2"
      aria-label="Requisitos de la contraseña"
    >
      {REQUISITOS_CONTRASENA.map((q) => (
        <li
          key={q.clave}
          className={cn(
            "flex items-center gap-1.5 text-[12.5px] transition-colors",
            r[q.clave] ? "text-exito" : "text-tenue",
          )}
        >
          {r[q.clave] ? (
            <Check className="size-3.5" strokeWidth={2.5} />
          ) : (
            <X className="size-3.5" />
          )}
          {q.texto}
        </li>
      ))}
    </ul>
  )
}

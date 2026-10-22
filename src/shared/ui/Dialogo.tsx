import { useEffect, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "./cn"

export function Dialogo({
  abierto,
  alCerrar,
  titulo,
  descripcion,
  children,
  pie,
  ancho = "md",
  cerrable = true,
}: {
  abierto: boolean
  alCerrar: () => void
  titulo: ReactNode
  descripcion?: ReactNode
  children?: ReactNode
  pie?: ReactNode
  ancho?: "sm" | "md" | "lg" | "xl"
  cerrable?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!abierto) return
    const previo = document.activeElement as HTMLElement | null
    const t = setTimeout(() => {
      const foco = ref.current?.querySelector<HTMLElement>(
        "[data-autofoco], input:not([type=hidden]), select, textarea, button:not([data-cerrar])",
      )
      foco?.focus()
    }, 20)
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape" && cerrable) alCerrar()
      if (e.key === "Tab" && ref.current) {
        const f = [
          ...ref.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ].filter((x) => !x.hasAttribute("disabled"))
        if (!f.length) return
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault()
          f[f.length - 1].focus()
        } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
          e.preventDefault()
          f[0].focus()
        }
      }
    }
    document.addEventListener("keydown", tecla)
    document.body.style.overflow = "hidden"
    return () => {
      clearTimeout(t)
      document.removeEventListener("keydown", tecla)
      document.body.style.overflow = ""
      previo?.focus?.()
    }
  }, [abierto, cerrable, alCerrar])

  if (!abierto) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={() => cerrable && alCerrar()}
        aria-hidden
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className={cn(
          "animar-aparecer relative flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-borde bg-superficie shadow-2xl sm:rounded-2xl",
          {
            sm: "sm:max-w-md",
            md: "sm:max-w-lg",
            lg: "sm:max-w-2xl",
            xl: "sm:max-w-5xl",
          }[ancho],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-borde px-5 py-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight">{titulo}</h2>
            {descripcion && (
              <p className="mt-1 text-[13px] text-suave">{descripcion}</p>
            )}
          </div>
          {cerrable && (
            <button
              data-cerrar
              onClick={alCerrar}
              className="-mr-1 flex size-8 items-center justify-center rounded-md text-tenue hover:bg-superficie-2 hover:text-texto"
              aria-label="Cerrar"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {children && (
          <div className="overflow-y-auto px-5 py-4">{children}</div>
        )}
        {pie && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-borde bg-superficie-2/50 px-5 py-3">
            {pie}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react"
import { Check, ChevronDown, Search, X } from "lucide-react"
import { normalizarTexto } from "@/domain/text"
import { useClickFuera } from "@/shared/hooks"
import { cn } from "./cn"

export interface OpcionSelector {
  valor: string
  etiqueta: string
  grupo?: string
  detalle?: string
}

/** Selector de varios valores con búsqueda; los elegidos se muestran como fichas (en el orden elegido). */
export function SelectorMultiple({
  valores,
  opciones,
  alCambiar,
  marcador = "Elegir…",
  permitirLibre,
  vacio = "Sin coincidencias",
  className,
  invalido,
  unico,
  icono,
}: {
  valores: string[]
  opciones: OpcionSelector[]
  alCambiar: (v: string[]) => void
  marcador?: string
  permitirLibre?: boolean
  vacio?: ReactNode
  className?: string
  invalido?: boolean
  unico?: boolean
  icono?: ReactNode
}) {
  const [abierto, setAbierto] = useState(false)
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const cerrar = useCallback(() => setAbierto(false), [])
  useClickFuera(ref, cerrar, abierto)
  const mapa = useMemo(
    () => new Map(opciones.map((o) => [o.valor, o])),
    [opciones],
  )
  const filtradas = useMemo(() => {
    const nq = normalizarTexto(q)
    return opciones
      .filter(
        (o) =>
          !nq ||
          normalizarTexto(`${o.etiqueta} ${o.detalle ?? ""}`).includes(nq),
      )
      .slice(0, 200)
  }, [opciones, q])
  const grupos = useMemo(() => {
    const g = new Map<string, OpcionSelector[]>()
    for (const o of filtradas)
      g.set(o.grupo ?? "", [...(g.get(o.grupo ?? "") ?? []), o])
    return [...g]
  }, [filtradas])

  const alternar = (v: string) => {
    if (unico) {
      alCambiar([v])
      setAbierto(false)
      return
    }
    alCambiar(
      valores.includes(v) ? valores.filter((x) => x !== v) : [...valores, v],
    )
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={abierto}
        onClick={() => setAbierto(true)}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") &&
          (e.preventDefault(), setAbierto(true))
        }
        className={cn(
          "flex min-h-9 w-full cursor-pointer flex-wrap items-center gap-1 rounded-lg border bg-superficie py-1 pr-8 pl-2 text-sm transition-colors",
          abierto
            ? "border-acento ring-3 ring-acento/15"
            : invalido
              ? "border-peligro"
              : "border-borde hover:border-borde-fuerte",
        )}
      >
        {icono && <span className="mr-0.5 text-tenue">{icono}</span>}
        {valores.length === 0 && (
          <span className="px-1 text-tenue">{marcador}</span>
        )}
        {valores.map((v) => (
          <span
            key={v}
            className="inline-flex h-6 max-w-full items-center gap-1 rounded-md bg-superficie-3 pr-1 pl-2 text-[12.5px]"
          >
            <span className="truncate">{mapa.get(v)?.etiqueta ?? v}</span>
            {!unico && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  alCambiar(valores.filter((x) => x !== v))
                }}
                className="flex size-4 items-center justify-center rounded text-tenue hover:text-texto"
                aria-label={`Quitar ${mapa.get(v)?.etiqueta ?? v}`}
              >
                <X className="size-3" />
              </button>
            )}
          </span>
        ))}
        <ChevronDown className="pointer-events-none absolute top-2.5 right-2.5 size-4 text-tenue" />
      </div>
      {abierto && (
        <div className="animar-aparecer absolute z-40 mt-1 w-full min-w-64 overflow-hidden rounded-xl border border-borde bg-superficie-2 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-borde px-3">
            <Search className="size-4 text-tenue" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setAbierto(false)
                if (e.key === "Enter") {
                  e.preventDefault()
                  if (filtradas[0]) alternar(filtradas[0].valor)
                  else if (permitirLibre && q.trim()) {
                    alternar(q.trim())
                    setQ("")
                  }
                }
              }}
              placeholder={
                permitirLibre ? "Buscar o escribir un valor…" : "Buscar…"
              }
              className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-tenue"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {grupos.map(([g, ops]) => (
              <div key={g || "_"}>
                {g && (
                  <p className="px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-tenue uppercase">
                    {g}
                  </p>
                )}
                {ops.map((o) => {
                  const sel = valores.includes(o.valor)
                  return (
                    <button
                      key={o.valor}
                      type="button"
                      onClick={() => alternar(o.valor)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-superficie-3",
                        sel && "text-acento",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded border",
                          sel
                            ? "border-acento bg-acento text-sobre-acento"
                            : "border-borde-fuerte",
                          unico && "rounded-full",
                        )}
                      >
                        {sel && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {o.etiqueta}
                      </span>
                      {o.detalle && (
                        <span className="shrink-0 text-[12px] text-tenue">
                          {o.detalle}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
            {filtradas.length === 0 &&
              (permitirLibre && q.trim() ? (
                <button
                  type="button"
                  className="w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-superficie-3"
                  onClick={() => (alternar(q.trim()), setQ(""))}
                >
                  Agregar «{q.trim()}»
                </button>
              ) : (
                <p className="px-3 py-4 text-center text-[13px] text-tenue">
                  {vacio}
                </p>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

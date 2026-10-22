import { useEffect, useRef, useState } from "react"
import type { EChartsOption, ECharts } from "echarts"
import { cn } from "./cn"

export interface ColoresTema {
  texto: string
  suave: string
  tenue: string
  borde: string
  acento: string
  superficie: string
  modo: "claro" | "oscuro"
}

function leer(): ColoresTema {
  const css = getComputedStyle(document.documentElement)
  const v = (n: string) => css.getPropertyValue(n).trim()
  return {
    texto: v("--c-texto"),
    suave: v("--c-suave"),
    tenue: v("--c-tenue"),
    borde: v("--c-borde"),
    acento: v("--c-acento"),
    superficie: v("--c-superficie-2"),
    modo:
      document.documentElement.dataset.tema === "claro" ? "claro" : "oscuro",
  }
}

/** Colores del tema actual (se actualizan al cambiar entre claro y oscuro). */
export function useColoresTema(): ColoresTema {
  const [c, setC] = useState(leer)
  useEffect(() => {
    const o = new MutationObserver(() => setC(leer()))
    o.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-tema"],
    })
    return () => o.disconnect()
  }, [])
  return c
}

/** Envoltorio de ECharts: carga la librería bajo demanda y se ajusta al tamaño del contenedor. */
export function Grafico({
  opcion,
  className,
  alto = 280,
  etiqueta,
}: {
  opcion: EChartsOption
  className?: string
  alto?: number
  etiqueta: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const instancia = useRef<ECharts | null>(null)
  const ultima = useRef(opcion)
  ultima.current = opcion

  useEffect(() => {
    let vivo = true
    let observador: ResizeObserver | null = null
    import("echarts").then((echarts) => {
      if (!vivo || !ref.current) return
      instancia.current = echarts.init(ref.current, undefined, {
        renderer: "canvas",
      })
      instancia.current.setOption(ultima.current, true)
      observador = new ResizeObserver(() => instancia.current?.resize())
      observador.observe(ref.current)
    })
    return () => {
      vivo = false
      observador?.disconnect()
      instancia.current?.dispose()
      instancia.current = null
    }
  }, [])

  useEffect(() => {
    instancia.current?.setOption(opcion, true)
  }, [opcion])

  return (
    <div
      ref={ref}
      role="img"
      aria-label={etiqueta}
      className={cn("w-full", className)}
      style={{ height: alto }}
    />
  )
}

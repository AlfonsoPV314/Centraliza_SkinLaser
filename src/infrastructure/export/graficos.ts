// Construcción de opciones de ECharts a partir de un bloque de gráfico (compartido por la vista previa y los exportadores).
import type { EChartsOption, SeriesOption } from "echarts"
import {
  agrupar,
  cajas,
  histograma,
  mapaCalor,
  tendenciaLineal,
} from "@/domain/charts"
import type { Registro } from "@/domain/model"
import type { Bloque } from "@/domain/templates"

export type BloqueGrafico = Extract<Bloque, { tipo: "grafico" }>
export const PALETA = [
  "#1C9196",
  "#3B6FD8",
  "#D98B1F",
  "#8256D0",
  "#D0457E",
  "#2E9D5B",
  "#6B7A90",
  "#C2412D",
]

export interface DatosGrafico {
  opcion: EChartsOption
  /** Mismos datos en forma tabular (para Excel y accesibilidad). */
  tabla: { encabezados: string[]; filas: (string | number)[][] }
  vacio: boolean
}

interface Tema {
  texto: string
  suave: string
  lineas: string
  fondo: string
}
const TEMAS: Record<"claro" | "oscuro", Tema> = {
  claro: {
    texto: "#1E2733",
    suave: "#5B6878",
    lineas: "#E3E7EC",
    fondo: "#FFFFFF",
  },
  oscuro: {
    texto: "#E6EBF1",
    suave: "#93A0B2",
    lineas: "#2A3442",
    fondo: "transparent",
  },
}

const fmt = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 })
const compacto = new Intl.NumberFormat("es-CL", {
  notation: "compact",
  maximumFractionDigits: 1,
})

export function construirGrafico(
  b: BloqueGrafico,
  registros: Registro[],
  etiqueta: (c: string) => string,
  modo: "claro" | "oscuro" = "claro",
): DatosGrafico {
  const t = TEMAS[modo]
  const ejeBase = {
    axisLine: { lineStyle: { color: t.lineas } },
    axisLabel: { color: t.suave, fontSize: 11 },
    splitLine: { lineStyle: { color: t.lineas } },
  }
  const comun: EChartsOption = {
    color: PALETA,
    backgroundColor: t.fondo,
    textStyle: {
      fontFamily: "IBM Plex Sans, Helvetica, Arial, sans-serif",
      color: t.texto,
    },
    grid: { left: 12, right: 18, top: 36, bottom: 12, containLabel: true },
    tooltip: {
      trigger: "axis",
      valueFormatter: (v) =>
        typeof v === "number" ? fmt.format(v) : String(v),
    },
    legend: { top: 0, textStyle: { color: t.suave }, type: "scroll" },
  }
  const nombreY =
    b.agregacion === "conteo"
      ? "Cantidad"
      : `${
          b.agregacion === "suma" ? "Suma" : "Promedio"
        } de ${etiqueta(b.campoY ?? "").toLowerCase()}`

  switch (b.grafico) {
    case "barras":
    case "barras_apiladas":
    case "lineas":
    case "areas":
    case "tendencia": {
      const d = agrupar(
        registros,
        b.campoX,
        b.agregacion,
        b.campoY,
        b.grafico === "barras_apiladas" ? b.campoSerie : undefined,
      )
      const esBarra = b.grafico === "barras" || b.grafico === "barras_apiladas"
      const series: SeriesOption[] = d.series.map((s) => ({
        name: s.nombre === "Total" ? nombreY : s.nombre,
        type: esBarra ? "bar" : "line",
        data: s.valores,
        stack:
          b.grafico === "barras_apiladas" || b.grafico === "areas"
            ? "total"
            : undefined,
        smooth: !esBarra,
        showSymbol: d.categorias.length < 30,
        areaStyle: b.grafico === "areas" ? { opacity: 0.25 } : undefined,
        barMaxWidth: 36,
        itemStyle: esBarra
          ? { borderRadius: b.grafico === "barras" ? [3, 3, 0, 0] : 0 }
          : undefined,
      }))
      if (b.grafico === "tendencia" && d.series[0]) {
        series.push({
          name: "Tendencia",
          type: "line",
          data: tendenciaLineal(d.series[0].valores),
          showSymbol: false,
          lineStyle: { type: "dashed", width: 2 },
          itemStyle: { color: PALETA[2] },
        })
      }
      const horizontal =
        esBarra &&
        b.grafico === "barras" &&
        d.categorias.some((c) => c.length > 14) &&
        !/fecha|^__/.test(b.campoX)
      const ejeCat = {
        ...ejeBase,
        type: "category" as const,
        data: horizontal ? [...d.categorias].reverse() : d.categorias,
        axisLabel: { ...ejeBase.axisLabel, hideOverlap: true },
      }
      const ejeVal = {
        ...ejeBase,
        type: "value" as const,
        axisLabel: {
          ...ejeBase.axisLabel,
          formatter: (v: number) => compacto.format(v),
        },
      }
      if (horizontal)
        series.forEach(
          (s) =>
            ((s as { data: number[] }).data = [
              ...(s as { data: number[] }).data,
            ].reverse()),
        )
      return {
        opcion: {
          ...comun,
          legend: { ...comun.legend, show: series.length > 1 },
          xAxis: horizontal ? ejeVal : ejeCat,
          yAxis: horizontal ? ejeCat : ejeVal,
          series,
        },
        tabla: {
          encabezados: [
            etiqueta(b.campoX),
            ...d.series.map((s) => (s.nombre === "Total" ? nombreY : s.nombre)),
          ],
          filas: d.categorias.map((c, i) => [
            c,
            ...d.series.map((s) => s.valores[i]),
          ]),
        },
        vacio: d.categorias.length === 0,
      }
    }
    case "circular":
    case "anillo": {
      const d = agrupar(
        registros,
        b.campoX,
        b.agregacion,
        b.campoY,
        undefined,
        12,
      )
      const datos = d.categorias.map((c, i) => ({
        name: c,
        value: d.series[0]?.valores[i] ?? 0,
      }))
      const total = datos.reduce((a, x) => a + x.value, 0)
      return {
        opcion: {
          ...comun,
          tooltip: {
            trigger: "item",
            valueFormatter: (v) => fmt.format(Number(v)),
          },
          legend: {
            ...comun.legend,
            orient: "vertical",
            right: 0,
            top: "middle",
          },
          title:
            b.grafico === "anillo"
              ? {
                  text: compacto.format(total),
                  subtext: "Total",
                  left: "34%",
                  top: "42%",
                  textAlign: "center",
                  textStyle: { color: t.texto, fontSize: 22, fontWeight: 600 },
                  subtextStyle: { color: t.suave },
                }
              : undefined,
          series: [
            {
              type: "pie",
              radius: b.grafico === "anillo" ? ["48%", "72%"] : ["0%", "72%"],
              center: ["35%", "52%"],
              data: datos,
              label: { color: t.suave, formatter: "{d} %" },
              itemStyle: {
                borderColor: t.fondo === "transparent" ? "#111821" : "#fff",
                borderWidth: 2,
              },
            },
          ],
        },
        tabla: {
          encabezados: [etiqueta(b.campoX), nombreY, "Porcentaje"],
          filas: datos.map((x) => [
            x.name,
            x.value,
            total ? Math.round((x.value / total) * 1000) / 10 : 0,
          ]),
        },
        vacio: datos.length === 0,
      }
    }
    case "histograma": {
      const campo = b.campoY ?? b.campoX
      const h = histograma(
        registros
          .map((r) => r[campo])
          .filter((v): v is number => typeof v === "number"),
      )
      return {
        opcion: {
          ...comun,
          legend: { show: false },
          xAxis: { ...ejeBase, type: "category", data: h.categorias },
          yAxis: { ...ejeBase, type: "value" },
          series: [
            {
              type: "bar",
              name: "Filas",
              data: h.valores,
              barCategoryGap: "4%",
            },
          ],
        },
        tabla: {
          encabezados: [`Tramo de ${etiqueta(campo).toLowerCase()}`, "Filas"],
          filas: h.categorias.map((c, i) => [c, h.valores[i]]),
        },
        vacio: h.valores.length === 0,
      }
    }
    case "dispersion": {
      const puntos = registros
        .map((r) => [r[b.campoX], r[b.campoY ?? ""]])
        .filter(
          (p): p is [number, number] =>
            typeof p[0] === "number" && typeof p[1] === "number",
        )
        .slice(0, 4000)
      return {
        opcion: {
          ...comun,
          tooltip: { trigger: "item" },
          legend: { show: false },
          xAxis: {
            ...ejeBase,
            type: "value",
            name: etiqueta(b.campoX),
            scale: true,
          },
          yAxis: {
            ...ejeBase,
            type: "value",
            name: etiqueta(b.campoY ?? ""),
            scale: true,
          },
          series: [
            {
              type: "scatter",
              data: puntos,
              symbolSize: 6,
              itemStyle: { opacity: 0.6 },
            },
          ],
        },
        tabla: {
          encabezados: [etiqueta(b.campoX), etiqueta(b.campoY ?? "")],
          filas: puntos,
        },
        vacio: puntos.length === 0,
      }
    }
    case "caja": {
      const d = cajas(registros, b.campoX, b.campoY ?? "")
      return {
        opcion: {
          ...comun,
          tooltip: { trigger: "item" },
          legend: { show: false },
          xAxis: { ...ejeBase, type: "category", data: d.categorias },
          yAxis: { ...ejeBase, type: "value", scale: true },
          series: [
            {
              type: "boxplot",
              data: d.datos,
              itemStyle: {
                color: "rgba(14,124,116,0.15)",
                borderColor: PALETA[0],
              },
            },
          ],
        },
        tabla: {
          encabezados: [
            etiqueta(b.campoX),
            "Mínimo",
            "Percentil 25",
            "Mediana",
            "Percentil 75",
            "Máximo",
          ],
          filas: d.categorias.map((c, i) => [c, ...d.datos[i]]),
        },
        vacio: d.categorias.length === 0,
      }
    }
    case "heatmap": {
      const m = mapaCalor(registros)
      const horas = m.horas.map(Number)
      const usadas = horas.filter((h) =>
        m.datos.some(([x, , v]) => x === h && v > 0),
      )
      const desde = usadas.length ? Math.min(...usadas) : 8
      const hasta = usadas.length ? Math.max(...usadas) : 20
      const datos = m.datos
        .filter(([h]) => h >= desde && h <= hasta)
        .map(([h, d, v]) => [h - desde, d, v])
      return {
        opcion: {
          ...comun,
          tooltip: { trigger: "item" },
          legend: { show: false },
          grid: { ...comun.grid, bottom: 48 },
          xAxis: {
            ...ejeBase,
            type: "category",
            data: m.horas.slice(desde, hasta + 1).map((h) => `${h}:00`),
            splitArea: { show: true },
          },
          yAxis: {
            ...ejeBase,
            type: "category",
            data: m.dias,
            inverse: true,
            splitArea: { show: true },
          },
          visualMap: {
            min: 0,
            max: Math.max(1, m.maximo),
            calculable: false,
            orient: "horizontal",
            left: "center",
            bottom: 0,
            itemHeight: 120,
            textStyle: { color: t.suave },
            inRange: {
              color:
                modo === "oscuro"
                  ? ["#16202B", "#1C9196", "#8FDCDE"]
                  : ["#F1F6F7", "#6CC8CB", "#0D686D"],
            },
          },
          series: [
            {
              type: "heatmap",
              data: datos,
              label: { show: false },
              itemStyle: {
                borderColor: t.fondo === "transparent" ? "#111821" : "#fff",
                borderWidth: 1,
              },
            },
          ],
        },
        tabla: {
          encabezados: [
            "Día",
            ...m.horas.slice(desde, hasta + 1).map((h) => `${h}:00`),
          ],
          filas: m.dias.map((dia, d) => [
            dia,
            ...horas
              .slice(desde, hasta + 1)
              .map(
                (h) => m.datos.find(([x, y]) => x === h && y === d)?.[2] ?? 0,
              ),
          ]),
        },
        vacio: m.maximo === 0,
      }
    }
  }
}

/** Renderiza la opción a PNG (data URL) fuera de pantalla. Solo navegador. */
export async function graficoPNG(
  opcion: EChartsOption,
  ancho = 1000,
  alto = 500,
): Promise<string> {
  const echarts = await import("echarts")
  const div = document.createElement("div")
  div.style.cssText = `position:fixed;left:-10000px;top:0;width:${ancho}px;height:${alto}px`
  document.body.appendChild(div)
  try {
    const grafico = echarts.init(div, undefined, {
      renderer: "canvas",
      width: ancho,
      height: alto,
    })
    grafico.setOption({ ...opcion, animation: false })
    const url = grafico.getDataURL({
      type: "png",
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    })
    grafico.dispose()
    return url
  } finally {
    div.remove()
  }
}

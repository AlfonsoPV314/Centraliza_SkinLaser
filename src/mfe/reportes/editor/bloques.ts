import type { Component } from "vue"
import {
  Box,
  ChartArea,
  ChartColumn,
  ChartColumnBig,
  ChartColumnStacked,
  ChartLine,
  ChartPie,
  ChartScatter,
  Disc,
  Grid3x3,
  Hash,
  Table2,
  TrendingUp,
  Type,
} from "@lucide/vue"
import type { ColumnaCatalogo } from "@/domain/model"
import type { Bloque, TipoBloque, TipoGrafico } from "@/domain/templates"
import type { OpcionSelector } from "@/shared/ui"

export type BloqueDe<T extends TipoBloque> = Extract<Bloque, { tipo: T }>
export type ErrorDe = (campo: string) => string | undefined

export const ICONOS_GRAFICO: Record<TipoGrafico, Component> = {
  barras: ChartColumn,
  barras_apiladas: ChartColumnStacked,
  lineas: ChartLine,
  tendencia: TrendingUp,
  areas: ChartArea,
  circular: ChartPie,
  anillo: Disc,
  histograma: ChartColumnBig,
  dispersion: ChartScatter,
  caja: Box,
  heatmap: Grid3x3,
}

export const TIPOS_BLOQUE: { tipo: TipoBloque; nombre: string; icono: Component; ayuda: string }[] = [
  { tipo: "tabla", nombre: "Tabla", icono: Table2, ayuda: "Filas del período con las columnas elegidas" },
  { tipo: "grafico", nombre: "Gráfico", icono: ChartColumn, ayuda: "Barras, líneas, tortas y más" },
  { tipo: "medidas", nombre: "Medidas", icono: Hash, ayuda: "Suma, promedio, mediana, variación…" },
  { tipo: "texto", nombre: "Texto", icono: Type, ayuda: "Párrafo con datos del período" },
]

export const grupoDe = (c: ColumnaCatalogo) =>
  c.clave.startsWith("__") ? "Derivados de la fecha" : c.origen === "extra" ? "Columnas adicionales" : "Columnas"

export const opcionesDe = (cols: ColumnaCatalogo[]): OpcionSelector[] =>
  cols.map((c) => ({ valor: c.clave, etiqueta: c.etiqueta, grupo: grupoDe(c) }))

export const sinDerivados = (cols: ColumnaCatalogo[]) => cols.filter((c) => !c.clave.startsWith("__"))

export const mover = <T>(lista: T[], i: number, delta: number) => {
  const j = i + delta
  if (j < 0 || j >= lista.length) return lista
  const copia = [...lista]
  ;[copia[i], copia[j]] = [copia[j], copia[i]]
  return copia
}

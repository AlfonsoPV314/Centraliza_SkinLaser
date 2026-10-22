// Prepara el contenido de cada bloque de una plantilla a partir de los registros consultados.
import type { ColumnaCatalogo, Registro, TipoCampo } from "@/domain/model"
import { CAMPOS_DERIVADOS } from "@/domain/columns"
import { etiquetaCategoria } from "@/domain/charts"
import { formatearFecha } from "@/domain/dates"
import {
  formatearCLP,
  formatearNumero,
  formatearPorcentaje,
} from "@/domain/format"
import { redactarProsa } from "@/domain/prose"
import { formatearRun } from "@/domain/run"
import { ETIQUETAS_MEDIDA, calcularMedidas, type Medida } from "@/domain/stats"
import type {
  ArchivoPlantilla,
  Plantilla,
  TipoGrafico,
} from "@/domain/templates"
import { construirGrafico, type DatosGrafico } from "./graficos"

export interface ColumnaTabla {
  clave: string
  etiqueta: string
  tipo: TipoCampo
}

export type ContenidoBloque = {
  tipo: "tabla"
  titulo: string
  columnas: ColumnaTabla[]
  filas: Registro[]
} | {
  tipo: "grafico"
  titulo: string
  grafico: TipoGrafico
  datos: DatosGrafico
} | {
  tipo: "medidas"
  titulo: string
  campo: string
  filas: {
    medida: string
    valor: string
    bruto: number | string | null
    esMonto: boolean
    esPorcentaje: boolean
  }[]
} | { tipo: "texto"; titulo: string; texto: string }

export interface ContextoReporte {
  plantilla: Plantilla
  registros: Registro[]
  /** Registros del período anterior de igual duración (null si no corresponde). */
  anteriores: Registro[] | null
  columnas: ColumnaCatalogo[]
  periodo: string
}

export function tipoColumna(
  columnas: ColumnaCatalogo[],
  clave: string,
): TipoCampo {
  return (
    [...columnas, ...CAMPOS_DERIVADOS].find((c) => c.clave === clave)?.tipo ??
    "texto"
  )
}

export function etiquetaColumna(
  columnas: ColumnaCatalogo[],
  clave: string,
): string {
  return (
    [...columnas, ...CAMPOS_DERIVADOS].find((c) => c.clave === clave)
      ?.etiqueta ?? clave
  )
}

/** Texto legible de una celda (PDF y vista previa). */
export function textoCelda(
  tipo: TipoCampo,
  clave: string,
  v: string | number | null | undefined,
): string {
  if (v === null || v === undefined || v === "") return ""
  if (clave.startsWith("__")) return etiquetaCategoria(clave, v)
  if (tipo === "monto" && typeof v === "number") return formatearCLP(v)
  if (tipo === "numero" && typeof v === "number") return formatearNumero(v)
  if (tipo === "fecha" && typeof v === "string") return formatearFecha(v)
  if (tipo === "documento" && typeof v === "string" && /^\d+-[\dK]$/.test(v))
    return formatearRun(v)
  return String(v)
}

const MEDIDAS_PORCENTUALES: Medida[] = ["porcentaje", "variacion"]

export function prepararArchivo(
  archivo: ArchivoPlantilla,
  ctx: ContextoReporte,
): ContenidoBloque[] {
  const et = (c: string) => etiquetaColumna(ctx.columnas, c)
  const pacientes = new Set(
    ctx.registros.map((r) => r.documento).filter(Boolean),
  ).size
  return archivo.bloques.map((b): ContenidoBloque => {
    switch (b.tipo) {
      case "tabla":
        return {
          tipo: "tabla",
          titulo: b.titulo,
          columnas: b.campos.map((c) => ({
            clave: c,
            etiqueta: et(c),
            tipo: tipoColumna(ctx.columnas, c),
          })),
          filas: ctx.registros,
        }
      case "grafico":
        return {
          tipo: "grafico",
          titulo: b.titulo,
          grafico: b.grafico,
          datos: construirGrafico(b, ctx.registros, et, "claro"),
        }
      case "medidas": {
        const esMonto = tipoColumna(ctx.columnas, b.campo) === "monto"
        const r = calcularMedidas(
          ctx.registros.map((x) => x[b.campo] ?? null),
          b.medidas,
          {
            total: ctx.registros.length,
            anterior: ctx.anteriores?.map((x) => x[b.campo] ?? null),
          },
        )
        return {
          tipo: "medidas",
          titulo: b.titulo,
          campo: et(b.campo),
          filas: b.medidas.map((m) => {
            const v = r[m] ?? null
            const pct = MEDIDAS_PORCENTUALES.includes(m)
            const valor =
              v === null
                ? "Sin dato"
                : typeof v === "string"
                  ? v
                  : pct
                    ? formatearPorcentaje(v)
                    : m === "conteo"
                      ? formatearNumero(v, 0)
                      : esMonto
                        ? formatearCLP(v)
                        : formatearNumero(v)
            return {
              medida: ETIQUETAS_MEDIDA[m],
              valor,
              bruto: v,
              esMonto: esMonto && !pct && m !== "conteo",
              esPorcentaje: pct,
            }
          }),
        }
      }
      case "texto": {
        const todas: Medida[] = [
          "conteo",
          "suma",
          "promedio",
          "mediana",
          "moda",
          "minimo",
          "maximo",
          "desviacion",
          "variacion",
        ]
        const medidas = calcularMedidas(
          ctx.registros.map((x) => x[b.campo] ?? null),
          todas,
          {
            total: ctx.registros.length,
            anterior: ctx.anteriores?.map((x) => x[b.campo] ?? null),
          },
        )
        return {
          tipo: "texto",
          titulo: b.titulo,
          texto: redactarProsa(b.texto, {
            periodo: ctx.periodo,
            filas: ctx.registros.length,
            pacientes,
            campo: et(b.campo),
            esMonto: tipoColumna(ctx.columnas, b.campo) === "monto",
            medidas,
          }),
        }
      }
    }
  })
}

/** ¿Algún bloque necesita el período anterior? */
export function necesitaAnterior(p: Plantilla): boolean {
  return p.archivos.some((a) =>
    a.bloques.some(
      (b) =>
        b.tipo === "texto" ||
        (b.tipo === "medidas" && b.medidas.includes("variacion")),
    ),
  )
}

export function nombreArchivo(
  p: Plantilla,
  a: ArchivoPlantilla,
  extension: string,
): string {
  const fecha = new Date().toISOString().slice(0, 10)
  const limpio = (s: string) =>
    s.replace(/[\\/:*?"<>|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  return `${limpio(p.nombre)} - ${limpio(a.nombre)} ${fecha}.${extension}`
}

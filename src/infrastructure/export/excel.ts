// Exportación a Excel (ExcelJS). Los textos se neutralizan contra inyección de fórmulas.
import type { Worksheet } from "exceljs"
import { MARCA } from "@/config/brand"
import { partesFecha } from "@/domain/dates"
import { neutralizarCelda } from "@/domain/sanitize"
import { etiquetaCategoria } from "@/domain/charts"
import { graficoPNG } from "./graficos"
import { textoCelda, type ContenidoBloque } from "./contenido"

const VERDE = "FF1C9196"
const GRIS = "FFF1F4F6"
const FORMATO_CLP = '"$"#,##0;-"$"#,##0'

function nombreHoja(base: string, usados: Set<string>) {
  const limpio =
    base
      .replace(/[\\/*?:[\]]/g, " ")
      .trim()
      .slice(0, 28) || "Hoja"
  let nombre = limpio
  for (let i = 2; usados.has(nombre.toLowerCase()); i++)
    nombre = `${limpio.slice(0, 25)} (${i})`
  usados.add(nombre.toLowerCase())
  return nombre
}

function encabezado(ws: Worksheet, fila: number, valores: string[]) {
  const r = ws.getRow(fila)
  valores.forEach((v, i) => {
    const c = r.getCell(i + 1)
    c.value = v
    c.font = { bold: true, color: { argb: "FFFFFFFF" } }
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE } }
    c.alignment = { vertical: "middle", wrapText: true }
  })
  r.height = 22
}

function aFechaExcel(iso: string): Date | string {
  const p = partesFecha(iso)
  if (!p) return iso
  const [h, m] = p.hora ? p.hora.split(":").map(Number) : [0, 0]
  return new Date(Date.UTC(p.a, p.m - 1, p.d, h, m))
}

export interface MetaReporte {
  titulo: string
  plantilla: string
  periodo: string
  filtros: string
  filas: number
}

export async function generarExcel(
  bloques: ContenidoBloque[],
  meta: MetaReporte,
): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default
  const wb = new ExcelJS.Workbook()
  wb.creator = MARCA.nombreCorto
  wb.created = new Date()
  const usados = new Set<string>()

  const resumen = wb.addWorksheet(nombreHoja("Resumen", usados), {
    views: [{ showGridLines: false }],
  })
  resumen.columns = [
    { width: 34 },
    { width: 22 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
  ]
  resumen.getCell("A1").value = neutralizarCelda(meta.titulo)
  resumen.getCell("A1").font = { bold: true, size: 16, color: { argb: VERDE } }
  const filasMeta: [string, string | number][] = [
    ["Plantilla", meta.plantilla],
    ["Período", meta.periodo],
    ["Filtros", meta.filtros],
    ["Filas incluidas", meta.filas],
    [
      "Generado",
      new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" }),
    ],
  ]
  filasMeta.forEach(([k, v], i) => {
    const r = resumen.getRow(3 + i)
    r.getCell(1).value = k
    r.getCell(1).font = { color: { argb: "FF5B6878" } }
    r.getCell(2).value = typeof v === "string" ? neutralizarCelda(v) : v
    r.getCell(2).alignment = { wrapText: false }
  })
  let fila = 3 + filasMeta.length + 2

  for (const b of bloques) {
    if (b.tipo === "tabla") {
      const ws = wb.addWorksheet(nombreHoja(b.titulo, usados), {
        views: [{ state: "frozen", ySplit: 1 }],
      })
      ws.columns = b.columnas.map((c) => ({
        width: Math.min(
          42,
          Math.max(12, c.etiqueta.length + 4, c.tipo === "texto" ? 24 : 14),
        ),
      }))
      encabezado(
        ws,
        1,
        b.columnas.map((c) => c.etiqueta),
      )
      b.filas.forEach((r, i) => {
        const row = ws.getRow(i + 2)
        b.columnas.forEach((c, j) => {
          const v = r[c.clave]
          const cell = row.getCell(j + 1)
          if (v === null || v === undefined) return
          if (c.clave.startsWith("__"))
            cell.value = etiquetaCategoria(c.clave, v)
          else if (c.tipo === "fecha" && typeof v === "string") {
            cell.value = aFechaExcel(v)
            cell.numFmt = v.length > 10 ? "dd-mm-yyyy hh:mm" : "dd-mm-yyyy"
          } else if (c.tipo === "monto" && typeof v === "number") {
            cell.value = v
            cell.numFmt = FORMATO_CLP
          } else if (typeof v === "number") cell.value = v
          else cell.value = neutralizarCelda(textoCelda(c.tipo, c.clave, v))
        })
      })
      if (b.columnas.length)
        ws.autoFilter = {
          from: { row: 1, column: 1 },
          to: {
            row: Math.max(1, b.filas.length + 1),
            column: b.columnas.length,
          },
        }
      resumen.getCell(`A${fila}`).value =
        `${b.titulo}: ver hoja «${ws.name}» (${b.filas.length} filas)`
      resumen.getCell(`A${fila}`).font = {
        italic: true,
        color: { argb: "FF5B6878" },
      }
      fila += 2
      continue
    }

    resumen.getCell(`A${fila}`).value = neutralizarCelda(b.titulo)
    resumen.getCell(`A${fila}`).font = { bold: true, size: 12 }
    fila++

    if (b.tipo === "texto") {
      resumen.mergeCells(fila, 1, fila, 6)
      const c = resumen.getCell(`A${fila}`)
      c.value = neutralizarCelda(b.texto)
      c.alignment = { wrapText: true, vertical: "top" }
      resumen.getRow(fila).height = Math.max(
        30,
        Math.ceil(b.texto.length / 110) * 16,
      )
      fila += 2
    } else if (b.tipo === "medidas") {
      encabezado(resumen, fila, [`Medida (${b.campo})`, "Valor"])
      fila++
      for (const m of b.filas) {
        const r = resumen.getRow(fila++)
        r.getCell(1).value = m.medida
        const c = r.getCell(2)
        if (typeof m.bruto === "number") {
          c.value = m.esPorcentaje ? m.bruto / 100 : m.bruto
          c.numFmt = m.esPorcentaje
            ? "0.0%"
            : m.esMonto
              ? FORMATO_CLP
              : "#,##0.##"
        } else c.value = m.valor
        r.getCell(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: GRIS },
        }
      }
      fila++
    } else if (b.tipo === "grafico") {
      if (b.datos.vacio) {
        resumen.getCell(`A${fila}`).value =
          "Sin datos para este gráfico en el período elegido."
        fila += 2
        continue
      }
      const png = await graficoPNG(b.datos.opcion, 900, 420)
      const id = wb.addImage({ base64: png, extension: "png" })
      resumen.addImage(id, {
        tl: { col: 0, row: fila - 1 },
        ext: { width: 720, height: 336 },
      })
      fila += 18
      encabezado(resumen, fila, b.datos.tabla.encabezados.slice(0, 12))
      fila++
      for (const r of b.datos.tabla.filas.slice(0, 200)) {
        const row = resumen.getRow(fila++)
        r.slice(0, 12).forEach(
          (v, i) =>
            (row.getCell(i + 1).value =
              typeof v === "string" ? neutralizarCelda(v) : v),
        )
      }
      fila++
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}

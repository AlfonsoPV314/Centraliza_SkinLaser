// Exportación a PDF (jsPDF + autotable). Gráficos rasterizados con ECharts.
import { MARCA } from "@/config/brand"
import { graficoPNG } from "./graficos"
import { textoCelda, type ContenidoBloque } from "./contenido"
import type { MetaReporte } from "./excel"

const VERDE: [number, number, number] = [28, 145, 150]
const TINTA: [number, number, number] = [30, 39, 51]
const SUAVE: [number, number, number] = [91, 104, 120]
const MAX_FILAS_TABLA = 1500

export async function generarPdf(
  bloques: ContenidoBloque[],
  meta: MetaReporte,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default
  const horizontal = bloques.some(
    (b) => b.tipo === "tabla" && b.columnas.length > 6,
  )
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: horizontal ? "landscape" : "portrait",
  })
  const ancho = doc.internal.pageSize.getWidth()
  const alto = doc.internal.pageSize.getHeight()
  const margen = 16
  const util = ancho - margen * 2
  let y = margen

  const espacio = (necesario: number) => {
    if (y + necesario > alto - 18) {
      doc.addPage()
      y = margen
    }
  }

  // Portada breve
  doc.setFillColor(...VERDE)
  doc.rect(0, 0, ancho, 3, "F")
  doc
    .setFont("helvetica", "normal")
    .setFontSize(9)
    .setTextColor(...SUAVE)
  doc.text(MARCA.nombreCorto.toUpperCase(), margen, y + 2)
  y += 10
  doc
    .setFont("helvetica", "bold")
    .setFontSize(18)
    .setTextColor(...TINTA)
  const titulo = doc.splitTextToSize(meta.titulo, util)
  doc.text(titulo, margen, y)
  y += titulo.length * 7 + 2
  doc
    .setFont("helvetica", "normal")
    .setFontSize(9.5)
    .setTextColor(...SUAVE)
  for (const linea of [
    `Período: ${meta.periodo}`,
    `Filtros: ${meta.filtros}`,
    `${meta.filas.toLocaleString("es-CL")} filas · generado el ${new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" })}`,
  ]) {
    const l = doc.splitTextToSize(linea, util)
    doc.text(l, margen, y)
    y += l.length * 4.6
  }
  y += 4
  doc.setDrawColor(227, 231, 236).line(margen, y, ancho - margen, y)
  y += 8

  for (const b of bloques) {
    espacio(24)
    doc
      .setFont("helvetica", "bold")
      .setFontSize(12.5)
      .setTextColor(...TINTA)
    doc.text(b.titulo, margen, y)
    y += 6

    if (b.tipo === "texto") {
      doc
        .setFont("helvetica", "normal")
        .setFontSize(10.5)
        .setTextColor(...TINTA)
      const lineas = doc.splitTextToSize(b.texto, util)
      for (const l of lineas) {
        espacio(6)
        doc.text(l, margen, y)
        y += 5.2
      }
      y += 6
    } else if (b.tipo === "medidas") {
      autoTable(doc, {
        startY: y,
        margin: { left: margen, right: margen },
        head: [[`Medida (${b.campo})`, "Valor"]],
        body: b.filas.map((m) => [m.medida, m.valor]),
        theme: "grid",
        styles: {
          fontSize: 9.5,
          cellPadding: 2.2,
          textColor: TINTA,
          lineColor: [227, 231, 236],
        },
        headStyles: { fillColor: VERDE, textColor: 255 },
        columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
        tableWidth: Math.min(util, 120),
      })
      y =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 10
    } else if (b.tipo === "grafico") {
      if (b.datos.vacio) {
        doc
          .setFont("helvetica", "italic")
          .setFontSize(10)
          .setTextColor(...SUAVE)
        doc.text(
          "Sin datos para este gráfico en el período elegido.",
          margen,
          y,
        )
        y += 10
        continue
      }
      const altoImg = Math.min(95, util * 0.48)
      espacio(altoImg + 4)
      const png = await graficoPNG(
        b.datos.opcion,
        1000,
        Math.round(1000 * (altoImg / util)),
      )
      doc.addImage(png, "PNG", margen, y, util, altoImg)
      y += altoImg + 10
    } else if (b.tipo === "tabla") {
      const filas = b.filas.slice(0, MAX_FILAS_TABLA)
      autoTable(doc, {
        startY: y,
        margin: { left: margen, right: margen, bottom: 18 },
        head: [b.columnas.map((c) => c.etiqueta)],
        body: filas.map((r) =>
          b.columnas.map((c) => textoCelda(c.tipo, c.clave, r[c.clave])),
        ),
        theme: "striped",
        styles: {
          fontSize: b.columnas.length > 8 ? 7 : 8,
          cellPadding: 1.6,
          textColor: TINTA,
          overflow: "linebreak",
        },
        headStyles: { fillColor: VERDE, textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [246, 248, 249] },
        columnStyles: Object.fromEntries(
          b.columnas.map((c, i) => [
            i,
            c.tipo === "monto" || c.tipo === "numero"
              ? { halign: "right" }
              : {},
          ]),
        ),
      })
      y =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 6
      if (b.filas.length > MAX_FILAS_TABLA) {
        doc
          .setFont("helvetica", "italic")
          .setFontSize(9)
          .setTextColor(...SUAVE)
        doc.text(
          `Se muestran las primeras ${MAX_FILAS_TABLA.toLocaleString("es-CL")} de ${b.filas.length.toLocaleString("es-CL")} filas. El detalle completo está disponible en Excel.`,
          margen,
          y,
        )
        y += 6
      }
      y += 4
    }
  }

  const paginas = doc.getNumberOfPages()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    doc
      .setFont("helvetica", "normal")
      .setFontSize(8)
      .setTextColor(...SUAVE)
    doc.text(meta.plantilla, margen, alto - 8)
    doc.text(`Página ${i} de ${paginas}`, ancho - margen, alto - 8, {
      align: "right",
    })
  }
  return doc.output("blob")
}

import type { ArchivoGenerado, ReportesApi } from "@/contracts/reportes"
import { ERRORES } from "@/contracts/comunes"
import { CARACTERISTICAS } from "@/config/features"
import { diasEntre, sumarDias } from "@/domain/dates"
import { describirFiltro } from "@/domain/filters"
import { describirRango } from "@/domain/ranges"
import type { Registro } from "@/domain/model"
import { catalogoCompleto, ejecutarConsulta } from "./datos"
import { db } from "./db"
import { ahora, error, usuarioDeToken } from "./util"

/** Registros del período anterior de igual duración (según las fechas efectivamente incluidas). */
async function periodoAnterior(
  registros: Registro[],
  consulta: Parameters<typeof ejecutarConsulta>[0],
): Promise<Registro[] | null> {
  const fechas = registros
    .map((r) => r.__fecha)
    .filter((f): f is string => typeof f === "string")
    .map((f) => f.slice(0, 10))
    .sort()
  if (!fechas.length) return null
  const desde = fechas[0]
  const hasta = fechas[fechas.length - 1]
  const dias = diasEntre(desde, hasta) + 1
  const antDesde = sumarDias(desde, -dias)
  const antHasta = sumarDias(desde, -1)
  const todos = await ejecutarConsulta({ ...consulta, rango: null })
  return todos.filter(
    (r) =>
      typeof r.__fecha === "string" &&
      r.__fecha.slice(0, 10) >= antDesde &&
      r.__fecha.slice(0, 10) <= antHasta,
  )
}

export const reportesMock: ReportesApi = {
  async generar(token, p, alAvanzar) {
    await usuarioDeToken(token)
    const plantilla = await db.plantillas.get(p.plantillaId)
    if (!plantilla || plantilla.eliminadaEn)
      throw error(ERRORES.noEncontrado, "La plantilla ya no existe.")
    const archivos = plantilla.archivos.filter(
      (a) => CARACTERISTICAS.exportacion[a.formato],
    )
    if (!archivos.length)
      throw error(
        ERRORES.validacion,
        "La plantilla no tiene archivos para generar. Agregue al menos un archivo Excel o PDF.",
      )

    alAvanzar?.("Consultando los datos del período")
    const consulta = {
      campoFecha: p.campoFecha,
      rango: p.rango,
      filtros: p.filtros,
      unidad: plantilla.unidad,
    }
    const registros = await ejecutarConsulta(consulta)
    if (!registros.length)
      throw error(
        ERRORES.validacion,
        "No hay filas que coincidan con el período y los filtros elegidos. Amplíe el período o quite algún filtro.",
      )

    const {
      prepararArchivo,
      necesitaAnterior,
      nombreArchivo,
      etiquetaColumna,
    } = await import("../export/contenido")
    const columnas = await catalogoCompleto()
    const anteriores = necesitaAnterior(plantilla)
      ? await periodoAnterior(registros, consulta)
      : null
    const periodo = describirRango(p.rango)
      .replace(/^Se incluirán: /, "")
      .replace(/\.$/, "")
    const filtros = describirFiltro(p.filtros, (c) =>
      etiquetaColumna(columnas, c),
    )
    const ctx = { plantilla, registros, anteriores, columnas, periodo }

    const generados: ArchivoGenerado[] = []
    for (const a of archivos) {
      alAvanzar?.(
        `Generando «${a.nombre}» (${a.formato === "excel" ? "Excel" : "PDF"})`,
      )
      const bloques = prepararArchivo(a, ctx)
      const meta = {
        titulo: a.nombre,
        plantilla: plantilla.nombre,
        periodo,
        filtros,
        filas: registros.length,
      }
      if (a.formato === "excel") {
        const { generarExcel } = await import("../export/excel")
        generados.push({
          nombre: nombreArchivo(plantilla, a, "xlsx"),
          formato: "excel",
          contenido: await generarExcel(bloques, meta),
        })
      } else {
        const { generarPdf } = await import("../export/pdf")
        generados.push({
          nombre: nombreArchivo(plantilla, a, "pdf"),
          formato: "pdf",
          contenido: await generarPdf(bloques, meta),
        })
      }
    }
    await db.plantillas.put({
      ...plantilla,
      uso: { veces: plantilla.uso.veces + 1, ultimoUso: ahora() },
    })
    return generados
  },
}

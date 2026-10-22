// Microservicio Go «reportes» — base: /reportes/v1
// Punto de variación LPS: formatos Excel y/o PDF. En producción se generaría en Go (excelize, gofpdf/maroto).
import type { Grupo } from "../domain/filters"
import type { RangoFechas } from "../domain/ranges"

export interface PeticionReporte {
  plantillaId: string
  rango: RangoFechas
  filtros: Grupo
  campoFecha: string
}

export interface ArchivoGenerado {
  nombre: string
  formato: "excel" | "pdf"
  /** En el prototipo, el contenido; en producción, una URL firmada de descarga. */
  contenido: Blob
}

export interface ReportesApi {
  /** POST /reportes/v1/reportes → 201 { archivos } */
  generar(
    token: string,
    p: PeticionReporte,
    alAvanzar?: (paso: string) => void,
  ): Promise<ArchivoGenerado[]>
}

import type { MapeoColumna } from "@/domain/columns"
import type { TipoPlanilla } from "@/domain/model"
import type { AnalisisHoja } from "@/infrastructure/ingesta/lector"

/** Hoja de un archivo subido, con la elección del usuario (importarla o no) y su mapeo de columnas. */
export interface HojaElegida {
  archivoId: string
  archivo: string
  analisis: AnalisisHoja
  incluir: boolean
  tipoPlanilla: TipoPlanilla
  /** El usuario eligió el tipo a mano: deja de recalcularse al cambiar columnas. */
  tipoManual?: boolean
  mapeo: MapeoColumna[]
}

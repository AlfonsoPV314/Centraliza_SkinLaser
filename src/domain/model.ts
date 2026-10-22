// Tipos de dominio compartidos. Sin dependencias externas.
import type { TipoDocumento } from "./run"

export type TipoCampo = "texto" | "fecha" | "hora" | "numero" | "monto" | "documento" | "email" | "telefono"
export type TipoPlanilla = "pacientes" | "pagos"

/** Cada campo de texto guarda dos valores: el original (mostrar/exportar) y el normalizado (buscar/comparar). */
export interface ValorCampo {
  o: string
  n: string | null
}

export type Severidad = "error" | "advertencia"

export interface Problema {
  regla: string
  campo: string
  severidad: Severidad
  mensaje: string
}

/** Fila leída de una planilla, ya normalizada y validada (aún no guardada). */
export interface FilaProcesada {
  uid: string
  archivo: string
  hoja?: string
  numero: number // número de fila en la planilla (como lo vería el usuario en Excel)
  tipoPlanilla: TipoPlanilla
  crudos: Record<string, unknown>
  campos: Record<string, ValorCampo>
  doc: string | null
  tipoDoc: TipoDocumento | null
  forzarPasaporte?: boolean
  fechaRegistro: string | null
  monto: number | null
  problemas: Problema[]
}

export interface FilaGuardada {
  id: string
  importacionId: string
  archivo: string
  numero: number
  tipoPlanilla: TipoPlanilla
  doc: string
  tipoDoc: TipoDocumento
  fechaRegistro: string | null
  monto: number | null
  campos: Record<string, ValorCampo>
  claveDup: string | null
  creadaEn: string
}

export interface Paciente {
  doc: string
  tipoDoc: TipoDocumento
  campos: Record<string, ValorCampo>
  actualizadoEn: string
}

export interface ColumnaCatalogo {
  clave: string
  etiqueta: string
  tipo: TipoCampo
  base: boolean
  origen: "conocida" | "extra"
}

/** Fila "aplanada" para filtros y reportes. */
export type Registro = Record<string, string | number | null>

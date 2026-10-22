// Mensajes entre la aplicación y el Web Worker de lectura de planillas.
import type { MapeoColumna } from "@/domain/columns"
import type { FilaProcesada, TipoPlanilla } from "@/domain/model"

export interface AnalisisHoja {
  nombre: string
  totalFilas: number
  filaEncabezado: number
  /** Primeras filas (para elegir el encabezado y ver ejemplos). */
  vistaPrevia: unknown[][]
  mapeo: MapeoColumna[]
  tipoPlanilla: TipoPlanilla
}

export interface AnalisisArchivo {
  archivoId: string
  nombre: string
  hojas: AnalisisHoja[]
}

export type PeticionWorker = {
  id: number
  tipo: "analizar"
  archivoId: string
  nombre: string
  contenido: ArrayBuffer
} | {
  id: number
  tipo: "reanalizar"
  archivoId: string
  hoja: string
  filaEncabezado: number
} | {
  id: number
  tipo: "procesar"
  archivoId: string
  hoja: string
  filaEncabezado: number
  mapeo: MapeoColumna[]
  tipoPlanilla: TipoPlanilla
} | { id: number; tipo: "olvidar"; archivoId: string }

export type RespuestaWorker = { id: number; tipo: "ok"; resultado: unknown } | {
  id: number
  tipo: "progreso"
  proporcion: number
} | { id: number; tipo: "error"; mensaje: string }

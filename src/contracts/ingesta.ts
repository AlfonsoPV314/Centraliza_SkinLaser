// Microservicio Go «ingesta» — base: /ingesta/v1
// En el prototipo el parseo ocurre en el navegador (Web Worker). En producción:
//   POST /ingesta/v1/archivos (multipart) → AnalisisArchivo  (hojas, encabezado detectado, mapeo sugerido)
//   POST /ingesta/v1/archivos/{id}/procesar { mapeo } → FilaProcesada[]
import type { FilaGuardada, FilaProcesada } from "../domain/model"

export type AccionDuplicado = "conservar_anterior" | "conservar_nueva" | "guardar_ambas" | "decidir_despues"

export interface DecisionDuplicado {
  nueva: FilaProcesada
  accion: AccionDuplicado
  /** Fila guardada con la que coincide (null si coincide con otra fila del mismo lote). */
  existenteId: string | null
  existente: FilaGuardada | FilaProcesada
}

export interface PeticionImportacion {
  archivos: {
    nombre: string
    tipoPlanilla: "pacientes" | "pagos"
    filas: number
  }[]
  /** Filas válidas sin conflicto, ya resueltas las decisiones dentro del mismo lote. */
  insertar: FilaProcesada[]
  /** Decisiones sobre duplicados contra datos guardados o pendientes. */
  decisiones: DecisionDuplicado[]
  /** Filas con error: quedan pendientes de corrección y no se guardan. */
  conError: FilaProcesada[]
  /** Columnas extra nuevas (catálogo dinámico). */
  columnasExtra: {
    clave: string
    etiqueta: string
    tipo: import("../domain/model").TipoCampo
  }[]
}

export interface ConteosImportacion {
  nuevas: number
  reemplazadas: number
  ambas: number
  descartadas: number
  conError: number
  pendientes: number
}

export interface Importacion {
  id: string
  creadaEn: string
  usuario: string
  archivos: PeticionImportacion["archivos"]
  conteos: ConteosImportacion
  estado: "activa" | "deshecha"
  sePuedeDeshacer: boolean
}

export interface IngestaApi {
  /** POST /ingesta/v1/importaciones → 201 Importacion (transaccional) */
  confirmar(token: string, p: PeticionImportacion): Promise<Importacion>
  /** GET /ingesta/v1/importaciones?limite= */
  listar(token: string, limite?: number): Promise<Importacion[]>
  /** POST /ingesta/v1/importaciones/{id}/deshacer → 200 | 409 hay-importaciones-posteriores */
  deshacer(token: string, id: string): Promise<void>
}

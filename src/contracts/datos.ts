// Microservicio Go «datos» — base: /datos/v1
// Almacenamiento con esquema flexible: columnas base + documento JSON por fila y catálogo de columnas.
import type { Pagina, ParametrosPagina } from "./comunes"
import type {
  ColumnaCatalogo,
  FilaGuardada,
  FilaProcesada,
  Paciente,
  Registro,
} from "../domain/model"
import type { Grupo } from "../domain/filters"
import type { RangoFechas } from "../domain/ranges"
import type { AccionDuplicado, CombinacionCeldas } from "./ingesta"

export interface EstadoDatos {
  filas: number
  pacientes: number
  ultimaCarga: string | null
  filasConError: number
  duplicadosPendientes: number
  pacientesIncompletos: number
  faltantesPorCampo: Record<string, number>
  filasPorMes: { mes: string; filas: number }[]
  aniosDisponibles: number[]
}

export interface FilaConError {
  id: string
  importacionId: string
  fila: FilaProcesada
  creadaEn: string
}

export interface DuplicadoPendiente {
  id: string
  importacionId: string
  nueva: FilaProcesada
  existenteId: string | null
  existente: FilaGuardada | FilaProcesada
  creadaEn: string
}

/** Filas a eliminar: una lista explícita o todas las que coinciden con una búsqueda. */
export type SeleccionFilas =
  | { ids: string[] }
  | { busqueda: { q: string; filtros: Grupo | null } }

/** Columnas estructurales que no se pueden eliminar. */
export const COLUMNAS_PROTEGIDAS = ["documento", "fecha_registro", "monto"] as const

export interface Consulta {
  campoFecha: string
  rango: RangoFechas | null
  filtros: Grupo
  unidad: "filas" | "citas"
  /** Incluir filas con errores y duplicados sin resolver (por defecto solo los datos guardados). */
  incluirPendientes?: boolean
}

export interface DatosApi {
  /** GET /datos/v1/estado */
  estado(token: string): Promise<EstadoDatos>
  /** GET /datos/v1/columnas */
  columnas(token: string): Promise<ColumnaCatalogo[]>
  /** GET /datos/v1/columnas/{clave}/valores?limite= (autocompletado) */
  valoresDistintos(
    token: string,
    campo: string,
    limite?: number,
  ): Promise<string[]>
  /** POST /datos/v1/duplicados/consulta { claves } → filas guardadas con esas claves */
  buscarPorClaves(token: string, claves: string[]): Promise<FilaGuardada[]>
  /** POST /datos/v1/filas/consulta { q, filtros, pagina } — búsqueda libre más filtros por cualquier columna */
  listarFilas(
    token: string,
    q: string,
    p: ParametrosPagina,
    filtros?: Grupo | null,
  ): Promise<Pagina<FilaGuardada>>
  /**
   * POST /datos/v1/filas/eliminar { ids } | { busqueda } → cantidad eliminada.
   * Irreversible: las filas no pasan al historial ni pueden restaurarse.
   */
  eliminarFilas(token: string, seleccion: SeleccionFilas): Promise<number>
  /** GET /datos/v1/columnas/uso → cantidad de filas con valor en cada columna */
  usoColumnas(token: string): Promise<Record<string, number>>
  /** DELETE /datos/v1/columnas/{clave} → borra la columna y sus valores en todas las filas. Irreversible. */
  eliminarColumna(token: string, clave: string): Promise<{ filas: number }>

  /** GET /datos/v1/filas-con-error */
  filasConError(token: string): Promise<FilaConError[]>
  /** PUT /datos/v1/filas-con-error/{id} { fila } → 200 { resultado } */
  corregirFila(
    token: string,
    id: string,
    fila: FilaProcesada,
  ): Promise<"guardada" | "duplicada">
  /** DELETE /datos/v1/filas-con-error/{id} */
  descartarFilaConError(token: string, id: string): Promise<void>

  /** GET /datos/v1/duplicados-pendientes */
  duplicadosPendientes(token: string): Promise<DuplicadoPendiente[]>
  /** POST /datos/v1/duplicados-pendientes/{id}/resolver { accion, combinada?, combinacion? } */
  resolverDuplicado(
    token: string,
    id: string,
    accion: Exclude<AccionDuplicado, "decidir_despues">,
    combinada?: { fila: FilaProcesada; combinacion: CombinacionCeldas },
  ): Promise<void>

  /** GET /datos/v1/pacientes/incompletos */
  pacientesIncompletos(token: string): Promise<(Paciente & { faltantes: string[] })[]>
  /** PATCH /datos/v1/pacientes/{doc} */
  actualizarPaciente(
    token: string,
    doc: string,
    campos: Record<string, string>,
  ): Promise<void>

  /** POST /datos/v1/consultas → registros aplanados */
  consultar(token: string, c: Consulta): Promise<Registro[]>
  /** POST /datos/v1/consultas/conteo */
  contar(token: string, c: Consulta): Promise<{ total: number; sinHora: number }>
}

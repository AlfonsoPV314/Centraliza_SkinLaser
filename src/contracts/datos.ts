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
import type { AccionDuplicado } from "./ingesta"

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

export interface Consulta {
  campoFecha: string
  rango: RangoFechas | null
  filtros: Grupo
  unidad: "filas" | "citas"
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
  /** GET /datos/v1/filas?q=&pagina= */
  listarFilas(
    token: string,
    q: string,
    p: ParametrosPagina,
  ): Promise<Pagina<FilaGuardada>>

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
  /** POST /datos/v1/duplicados-pendientes/{id}/resolver { accion } */
  resolverDuplicado(
    token: string,
    id: string,
    accion: Exclude<AccionDuplicado, "decidir_despues">,
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

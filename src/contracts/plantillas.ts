// Microservicio Go «plantillas» — base: /plantillas/v1
import type { Pagina, ParametrosPagina } from "./comunes"
import type { Plantilla, TipoSalida } from "../domain/templates"

export interface FiltroPlantillas extends ParametrosPagina {
  q: string
  tipo: TipoSalida | "todos"
  campo: string | null
  orden: "recientes" | "mas_usadas" | "nombre"
}

export type DatosPlantilla = Omit<Plantilla, "id" | "uso" | "creadaEn" | "actualizadaEn" | "eliminadaEn">

export interface PlantillasApi {
  /** GET /plantillas/v1/plantillas?q=&tipo=&campo=&orden=&pagina=&porPagina= */
  listar(token: string, f: FiltroPlantillas): Promise<Pagina<Plantilla>>
  /** GET /plantillas/v1/plantillas/{id} */
  obtener(token: string, id: string): Promise<Plantilla>
  /** POST /plantillas/v1/plantillas → 201 | 409 nombre-duplicado */
  crear(token: string, datos: DatosPlantilla): Promise<Plantilla>
  /** PUT /plantillas/v1/plantillas/{id} → devuelve la versión anterior para permitir deshacer */
  actualizar(token: string, id: string, datos: DatosPlantilla): Promise<{
    actual: Plantilla
    anterior: Plantilla
  }>
  /** POST /plantillas/v1/plantillas/eliminar { ids } (eliminación lógica, recuperable) */
  eliminar(token: string, ids: string[]): Promise<void>
  /** POST /plantillas/v1/plantillas/restaurar { ids } */
  restaurar(token: string, ids: string[]): Promise<void>
  /** POST /plantillas/v1/plantillas/{id}/usos */
  registrarUso(token: string, id: string): Promise<void>
  /** GET /plantillas/v1/plantillas/resumen */
  resumen(token: string): Promise<{
    total: number
    masUsadas: Plantilla[]
    recientes: Plantilla[]
  }>
}

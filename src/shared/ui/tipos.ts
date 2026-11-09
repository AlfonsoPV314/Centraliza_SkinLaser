export interface OpcionSelector {
  valor: string
  etiqueta: string
  grupo?: string
  detalle?: string
}

export interface OpcionBuscable {
  valor: string
  etiqueta: string
  grupo?: string
  /** Texto secundario (p. ej. tipo de dato). También se usa al buscar. */
  detalle?: string
}

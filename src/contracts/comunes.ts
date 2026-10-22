// Tipos comunes a todos los microservicios.
// Errores con formato Problem Details (RFC 7807). El campo `detalle` siempre está en lenguaje del usuario.

export interface ProblemaApi {
  tipo: string // p. ej. "https://errores.sistema/credenciales-invalidas"
  titulo: string
  detalle: string
  estado: number // código HTTP
  campo?: string
}

export class ApiError extends Error {
  constructor(public problema: ProblemaApi) {
    super(problema.detalle)
  }
}

export interface Pagina<T> {
  items: T[]
  total: number
  pagina: number
  porPagina: number
}

export interface ParametrosPagina {
  pagina: number
  porPagina: number
}

/** Errores reconocidos por todos los servicios. */
export const ERRORES = {
  noAutenticado: {
    tipo: "no-autenticado",
    estado: 401,
    titulo: "Sesión no válida",
  },
  sinPermisos: { tipo: "sin-permisos", estado: 403, titulo: "Sin permisos" },
  noEncontrado: { tipo: "no-encontrado", estado: 404, titulo: "No encontrado" },
  conflicto: { tipo: "conflicto", estado: 409, titulo: "Conflicto" },
  validacion: { tipo: "validacion", estado: 422, titulo: "Datos inválidos" },
  limite: {
    tipo: "demasiados-intentos",
    estado: 429,
    titulo: "Demasiados intentos",
  },
} as const

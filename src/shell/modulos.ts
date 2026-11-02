// Registro de micro-frontends. Cada módulo declara sus rutas y entradas de navegación;
// el shell solo los compone (sin conocer sus pantallas internas).
import type { Component } from "vue"

export type Acceso = "publica" | "abierta" | "protegida" | "privada"

export interface RutaModulo {
  ruta: string
  pagina: () => Promise<Component | { default: Component }>
  soloAdmin?: boolean
}

export interface EntradaNavegacion {
  ruta: string
  etiqueta: string
  icono: Component
  orden: number
  soloAdmin?: boolean
  /** Clave de contador para mostrar una insignia (p. ej. pendientes de revisión). */
  contador?: "pendientes"
  /** Coincidir solo con la ruta exacta. */
  exacta?: boolean
}

export interface ModuloFrontend {
  id: string
  nombre: string
  /** Rutas solo sin sesión (ingreso): con sesión activa redirigen al inicio. */
  publicas?: RutaModulo[]
  /** Rutas accesibles con o sin sesión (p. ej. restablecer contraseña desde un enlace). */
  abiertas?: RutaModulo[]
  /** Rutas con sesión (dentro del shell privado). */
  privadas?: RutaModulo[]
  /** Rutas que requieren sesión pero usan el diseño público (p. ej. confirmar un cambio de contraseña). */
  protegidasPublicas?: RutaModulo[]
  navegacion?: EntradaNavegacion[]
}

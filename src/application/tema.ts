import type { Preferencias } from "@/contracts"

const CLAVE = "centraliza.tema"
export type Tema = Preferencias["tema"]

/** Tema recordado; el claro es el predeterminado. */
export function temaGuardado(): Tema {
  return localStorage.getItem(CLAVE) === "oscuro" ? "oscuro" : "claro"
}

/** Aplica el tema al documento y lo recuerda para las pantallas públicas. */
export function aplicarTema(t: Tema) {
  document.documentElement.dataset.tema = t
  document.documentElement.style.colorScheme = t === "claro" ? "light" : "dark"
  localStorage.setItem(CLAVE, t)
}

import type { Preferencias } from "@/contracts"

const CLAVE = "centraliza.tema"
export type Tema = Preferencias["tema"]

export function temaGuardado(): Tema {
  const t = localStorage.getItem(CLAVE)
  return t === "claro" ? "claro" : "oscuro"
}

/** Aplica el tema al documento y lo recuerda para las pantallas públicas. */
export function aplicarTema(t: Tema) {
  document.documentElement.dataset.tema = t
  document.documentElement.style.colorScheme = t === "claro" ? "light" : "dark"
  localStorage.setItem(CLAVE, t)
}

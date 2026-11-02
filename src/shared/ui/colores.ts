import { onScopeDispose, ref, type Ref } from "vue"

export interface ColoresTema {
  texto: string
  suave: string
  tenue: string
  borde: string
  acento: string
  superficie: string
  modo: "claro" | "oscuro"
}

function leer(): ColoresTema {
  const css = getComputedStyle(document.documentElement)
  const v = (n: string) => css.getPropertyValue(n).trim()
  return {
    texto: v("--c-texto"),
    suave: v("--c-suave"),
    tenue: v("--c-tenue"),
    borde: v("--c-borde"),
    acento: v("--c-acento"),
    superficie: v("--c-superficie"),
    modo: document.documentElement.dataset.tema === "oscuro" ? "oscuro" : "claro",
  }
}

/** Colores del tema actual (se actualizan al cambiar entre claro y oscuro). */
export function useColoresTema(): Ref<ColoresTema> {
  const c = ref(leer())
  const o = new MutationObserver(() => (c.value = leer()))
  o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] })
  onScopeDispose(() => o.disconnect())
  return c
}

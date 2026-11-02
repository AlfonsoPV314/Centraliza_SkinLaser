import {
  onScopeDispose,
  ref,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
  type WatchSource,
} from "vue"

/** Ejecuta una carga asíncrona y expone su estado. Ignora respuestas obsoletas y recarga al cambiar las fuentes. */
export function useCarga<T>(
  cargar: () => Promise<T>,
  fuentes: WatchSource[] = [],
) {
  const datos = shallowRef<T | null>(null) as Ref<T | null>
  const cargando = ref(true)
  const error = shallowRef<unknown>(null)
  let turno = 0
  const recargar = async (silencioso = false) => {
    const t = ++turno
    if (!silencioso) {
      cargando.value = true
      error.value = null
    }
    try {
      const d = await cargar()
      if (t === turno) {
        datos.value = d
        cargando.value = false
        error.value = null
      }
    } catch (e) {
      if (t === turno) {
        cargando.value = false
        error.value = e
      }
    }
  }
  if (fuentes.length) watch(fuentes, () => recargar(), { immediate: true })
  else recargar()
  return { datos, cargando, error, recargar }
}

export function useClickFuera(
  el: Ref<HTMLElement | null | undefined>,
  alSalir: () => void,
  activo: MaybeRefOrGetter<boolean> = true,
) {
  const f = (e: MouseEvent) => {
    if (!toValue(activo)) return
    if (el.value && !el.value.contains(e.target as Node)) alSalir()
  }
  document.addEventListener("mousedown", f)
  onScopeDispose(() => document.removeEventListener("mousedown", f))
}

export function useRetardo<T>(valor: MaybeRefOrGetter<T>, ms = 300): Ref<T> {
  const v = shallowRef(toValue(valor)) as Ref<T>
  let t: ReturnType<typeof setTimeout> | undefined
  watch(
    () => toValue(valor),
    (n) => {
      clearTimeout(t)
      t = setTimeout(() => (v.value = n), ms)
    },
  )
  onScopeDispose(() => clearTimeout(t))
  return v
}

/** Cuenta regresiva en segundos hasta una fecha ISO (o 0). */
export function useCuentaRegresiva(
  hasta: MaybeRefOrGetter<string | null | undefined>,
): Ref<number> {
  const calcular = () => {
    const h = toValue(hasta)
    return h ? Math.max(0, Math.ceil((new Date(h).getTime() - Date.now()) / 1000)) : 0
  }
  const s = ref(calcular())
  let i: ReturnType<typeof setInterval> | undefined
  watch(
    () => toValue(hasta),
    (h) => {
      clearInterval(i)
      s.value = calcular()
      if (h) i = setInterval(() => (s.value = calcular()), 1000)
    },
    { immediate: true },
  )
  onScopeDispose(() => clearInterval(i))
  return s
}

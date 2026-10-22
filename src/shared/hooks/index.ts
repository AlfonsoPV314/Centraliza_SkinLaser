import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DependencyList,
  type RefObject,
} from "react"

/** Ejecuta una carga asíncrona y expone su estado. Ignora respuestas obsoletas. */
export function useCarga<T>(cargar: () => Promise<T>, deps: DependencyList) {
  const [estado, setEstado] = useState<{
    datos: T | null
    cargando: boolean
    error: unknown
  }>({ datos: null, cargando: true, error: null })
  const turno = useRef(0)
  const ejecutar = useCallback(async (silencioso = false) => {
    const t = ++turno.current
    if (!silencioso) setEstado((e) => ({ ...e, cargando: true, error: null }))
    try {
      const datos = await cargar()
      if (t === turno.current)
        setEstado({ datos, cargando: false, error: null })
    } catch (error) {
      if (t === turno.current)
        setEstado((e) => ({ ...e, cargando: false, error }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => {
    ejecutar()
  }, [ejecutar])
  return {
    ...estado,
    recargar: ejecutar,
    setDatos: (f: (d: T | null) => T | null) =>
      setEstado((e) => ({ ...e, datos: f(e.datos) })),
  }
}

export function useClickFuera(
  ref: RefObject<HTMLElement | null>,
  alSalir: () => void,
  activo = true,
) {
  useEffect(() => {
    if (!activo) return
    const f = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) alSalir()
    }
    document.addEventListener("mousedown", f)
    return () => document.removeEventListener("mousedown", f)
  }, [ref, alSalir, activo])
}

export function useRetardo<T>(valor: T, ms = 300): T {
  const [v, setV] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return v
}

/** Cuenta regresiva en segundos hasta una fecha ISO (o 0). */
export function useCuentaRegresiva(hasta: string | null | undefined): number {
  const calcular = () =>
    hasta
      ? Math.max(0, Math.ceil((new Date(hasta).getTime() - Date.now()) / 1000))
      : 0
  const [s, setS] = useState(calcular)
  useEffect(() => {
    setS(calcular())
    if (!hasta) return
    const i = setInterval(() => setS(calcular()), 1000)
    return () => clearInterval(i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasta])
  return s
}

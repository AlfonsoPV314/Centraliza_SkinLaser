import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { Preferencias, Sesion, Usuario } from "@/contracts"
import { SESION } from "@/config/features"
import { useServicios } from "./servicios"
import { aplicarTema, temaGuardado } from "./tema"
import { estadoError } from "./errores"

const CLAVE = "centraliza.sesion"
export type MotivoCierre = "manual" | "inactividad" | "expirada"

interface ValorSesion {
  sesion: Sesion | null
  usuario: Usuario | null
  token: string
  verificando: boolean
  /** Motivo del último cierre (para informarlo en la pantalla de ingreso). */
  motivoCierre: MotivoCierre | null
  iniciar: (correo: string, contrasena: string) => Promise<Usuario>
  cerrar: (motivo?: MotivoCierre) => Promise<void>
  actualizarUsuario: (u: Usuario) => void
  guardarPreferencias: (cambios: Partial<Preferencias>) => Promise<void>
  /** Si el error es «sesión no válida», cierra la sesión. Devuelve true si lo manejó. */
  manejarNoAutenticado: (e: unknown) => boolean
  /** Segundos restantes cuando falta poco para cerrar por inactividad (null si no hay aviso). */
  aviso: number | null
  seguirConectado: () => void
}

const Contexto = createContext<ValorSesion | null>(null)

export function useSesion(): ValorSesion {
  const v = useContext(Contexto)
  if (!v) throw new Error("useSesion debe usarse dentro de ProveedorSesion")
  return v
}

/** Para pantallas privadas: usuario y token garantizados. */
export function useUsuario() {
  const { usuario, token } = useSesion()
  if (!usuario) throw new Error("Sin sesión")
  return { usuario, token }
}

const EVENTOS_ACTIVIDAD = [
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
  "mousemove",
] as const

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const s = useServicios()
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [verificando, setVerificando] = useState(true)
  const [motivoCierre, setMotivoCierre] = useState<MotivoCierre | null>(null)
  const [aviso, setAviso] = useState<number | null>(null)
  const ultimaActividad = useRef(Date.now())
  const ultimaRenovacion = useRef(Date.now())
  // Mientras se muestra el aviso, la actividad casual no cuenta: el usuario debe confirmar explícitamente.
  const avisoActivo = useRef(false)

  const fijar = useCallback((x: Sesion | null) => {
    setSesion(x)
    if (x) {
      localStorage.setItem(CLAVE, x.token)
      aplicarTema(x.usuario.preferencias.tema)
    } else localStorage.removeItem(CLAVE)
  }, [])

  // Restaurar sesión guardada.
  useEffect(() => {
    aplicarTema(temaGuardado())
    const token = localStorage.getItem(CLAVE)
    if (!token) return setVerificando(false)
    s.auth
      .sesionActual(token)
      .then((x) => {
        if (new Date(x.expiraEn).getTime() < Date.now())
          throw new Error("expirada")
        return s.auth.renovar(token)
      })
      .then(fijar)
      .catch(() => {
        localStorage.removeItem(CLAVE)
        setMotivoCierre("expirada")
      })
      .finally(() => setVerificando(false))
  }, [s, fijar])

  const cerrar = useCallback(
    async (motivo: MotivoCierre = "manual") => {
      const token = sesion?.token
      fijar(null)
      avisoActivo.current = false
      setAviso(null)
      setMotivoCierre(motivo)
      if (token) await s.auth.cerrarSesion(token).catch(() => {})
    },
    [s, sesion, fijar],
  )

  const iniciar = useCallback(
    async (correo: string, contrasena: string) => {
      const x = await s.auth.iniciarSesion(correo, contrasena)
      ultimaActividad.current = Date.now()
      ultimaRenovacion.current = Date.now()
      setMotivoCierre(null)
      fijar(x)
      return x.usuario
    },
    [s, fijar],
  )

  // Inactividad: aviso 60 s antes de los 15 min; la actividad renueva la sesión en el servidor (como máximo 1 vez por minuto).
  useEffect(() => {
    if (!sesion) return
    const limite = SESION.minutosInactividad * 60_000
    const marcar = () => {
      if (!avisoActivo.current) ultimaActividad.current = Date.now()
    }
    EVENTOS_ACTIVIDAD.forEach((e) =>
      window.addEventListener(e, marcar, { passive: true }),
    )
    const intervalo = setInterval(() => {
      const inactivo = Date.now() - ultimaActividad.current
      const restante = Math.ceil((limite - inactivo) / 1000)
      if (restante <= 0) {
        cerrar("inactividad")
        return
      }
      if (restante <= SESION.segundosAviso) {
        avisoActivo.current = true
        setAviso(restante)
        return
      }
      avisoActivo.current = false
      setAviso(null)
      if (inactivo < 60_000 && Date.now() - ultimaRenovacion.current > 60_000) {
        ultimaRenovacion.current = Date.now()
        s.auth
          .renovar(sesion.token)
          .then((x) =>
            setSesion((prev) =>
              prev ? { ...prev, expiraEn: x.expiraEn } : prev,
            ),
          )
          .catch((e) => {
            if (estadoError(e) === 401) cerrar("expirada")
          })
      }
    }, 1000)
    return () => {
      EVENTOS_ACTIVIDAD.forEach((e) => window.removeEventListener(e, marcar))
      clearInterval(intervalo)
    }
  }, [sesion, s, cerrar])

  const seguirConectado = useCallback(() => {
    avisoActivo.current = false
    setAviso(null)
    ultimaActividad.current = Date.now()
    ultimaRenovacion.current = Date.now()
    if (sesion)
      s.auth
        .renovar(sesion.token)
        .then((x) => setSesion((p) => (p ? { ...p, expiraEn: x.expiraEn } : p)))
        .catch(() => cerrar("expirada"))
  }, [s, sesion, cerrar])

  const actualizarUsuario = useCallback((u: Usuario) => {
    setSesion((p) => (p ? { ...p, usuario: u } : p))
    aplicarTema(u.preferencias.tema)
  }, [])

  const guardarPreferencias = useCallback(
    async (cambios: Partial<Preferencias>) => {
      if (!sesion) return
      const nuevas = { ...sesion.usuario.preferencias, ...cambios }
      if (cambios.tema) aplicarTema(cambios.tema)
      setSesion((p) =>
        p ? { ...p, usuario: { ...p.usuario, preferencias: nuevas } } : p,
      )
      const u = await s.usuarios.guardarPreferencias(sesion.token, nuevas)
      setSesion((p) => (p ? { ...p, usuario: u } : p))
    },
    [s, sesion],
  )

  const manejarNoAutenticado = useCallback(
    (e: unknown) => {
      if (estadoError(e) !== 401) return false
      cerrar("expirada")
      return true
    },
    [cerrar],
  )

  const valor = useMemo<ValorSesion>(
    () => ({
      sesion,
      usuario: sesion?.usuario ?? null,
      token: sesion?.token ?? "",
      verificando,
      motivoCierre,
      iniciar,
      cerrar,
      actualizarUsuario,
      guardarPreferencias,
      manejarNoAutenticado,
      aviso,
      seguirConectado,
    }),
    [
      sesion,
      verificando,
      motivoCierre,
      iniciar,
      cerrar,
      actualizarUsuario,
      guardarPreferencias,
      manejarNoAutenticado,
      aviso,
      seguirConectado,
    ],
  )
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

import { computed, reactive, readonly } from "vue"
import type { Preferencias, Sesion, Usuario } from "@/contracts"
import { SESION } from "@/config/features"
import { useServicios } from "./servicios"
import { aplicarTema, temaGuardado } from "./tema"
import { estadoError } from "./errores"

const CLAVE = "centraliza.sesion"
export type MotivoCierre = "manual" | "inactividad" | "expirada"

const EVENTOS_ACTIVIDAD = [
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
  "mousemove",
] as const

const estado = reactive({
  sesion: null as Sesion | null,
  verificando: true,
  /** Motivo del último cierre (para informarlo en la pantalla de ingreso). */
  motivoCierre: null as MotivoCierre | null,
  /** Segundos restantes cuando falta poco para cerrar por inactividad. */
  aviso: null as number | null,
})

let ultimaActividad = Date.now()
let ultimaRenovacion = Date.now()
// Mientras se muestra el aviso, la actividad casual no cuenta: el usuario debe confirmar explícitamente.
let avisoActivo = false
let detenerVigilancia: (() => void) | null = null
let resolverLista: () => void = () => {}
/** Se resuelve cuando terminó la verificación de la sesión guardada. */
export const sesionLista = new Promise<void>((r) => (resolverLista = r))

function fijar(x: Sesion | null) {
  estado.sesion = x
  if (x) {
    localStorage.setItem(CLAVE, x.token)
    aplicarTema(x.usuario.preferencias.tema)
    vigilarInactividad()
  } else {
    localStorage.removeItem(CLAVE)
    detenerVigilancia?.()
  }
}

function renovarEnServidor() {
  const s = useServicios()
  const token = estado.sesion?.token
  if (!token) return
  ultimaRenovacion = Date.now()
  s.auth
    .renovar(token)
    .then((x) => estado.sesion && (estado.sesion.expiraEn = x.expiraEn))
    .catch((e) => {
      if (estadoError(e) === 401) cerrar("expirada")
    })
}

// Inactividad: aviso antes de los 15 min; la actividad renueva la sesión en el servidor (como máximo 1 vez por minuto).
function vigilarInactividad() {
  detenerVigilancia?.()
  const limite = SESION.minutosInactividad * 60_000
  const marcar = () => {
    if (!avisoActivo) ultimaActividad = Date.now()
  }
  EVENTOS_ACTIVIDAD.forEach((e) =>
    window.addEventListener(e, marcar, { passive: true }),
  )
  const intervalo = setInterval(() => {
    const inactivo = Date.now() - ultimaActividad
    const restante = Math.ceil((limite - inactivo) / 1000)
    if (restante <= 0) return void cerrar("inactividad")
    if (restante <= SESION.segundosAviso) {
      avisoActivo = true
      estado.aviso = restante
      return
    }
    avisoActivo = false
    estado.aviso = null
    if (inactivo < 60_000 && Date.now() - ultimaRenovacion > 60_000)
      renovarEnServidor()
  }, 1000)
  detenerVigilancia = () => {
    EVENTOS_ACTIVIDAD.forEach((e) => window.removeEventListener(e, marcar))
    clearInterval(intervalo)
    detenerVigilancia = null
  }
}

/** Restaura la sesión guardada (una vez, al iniciar la aplicación). */
export async function restaurarSesion() {
  const s = useServicios()
  aplicarTema(temaGuardado())
  const token = localStorage.getItem(CLAVE)
  try {
    if (!token) return
    const x = await s.auth.sesionActual(token)
    if (new Date(x.expiraEn).getTime() < Date.now()) throw new Error("expirada")
    fijar(await s.auth.renovar(token))
  } catch {
    localStorage.removeItem(CLAVE)
    estado.motivoCierre = "expirada"
  } finally {
    estado.verificando = false
    resolverLista()
  }
}

async function iniciar(correo: string, contrasena: string) {
  const x = await useServicios().auth.iniciarSesion(correo, contrasena)
  ultimaActividad = Date.now()
  ultimaRenovacion = Date.now()
  estado.motivoCierre = null
  fijar(x)
  return x.usuario
}

async function cerrar(motivo: MotivoCierre = "manual") {
  const token = estado.sesion?.token
  fijar(null)
  avisoActivo = false
  estado.aviso = null
  estado.motivoCierre = motivo
  if (token) await useServicios().auth.cerrarSesion(token).catch(() => {})
}

function seguirConectado() {
  avisoActivo = false
  estado.aviso = null
  ultimaActividad = Date.now()
  renovarEnServidor()
}

function actualizarUsuario(u: Usuario) {
  if (estado.sesion) estado.sesion.usuario = u
  aplicarTema(u.preferencias.tema)
}

async function guardarPreferencias(cambios: Partial<Preferencias>) {
  const ses = estado.sesion
  if (!ses) return
  const nuevas = { ...ses.usuario.preferencias, ...cambios }
  if (cambios.tema) aplicarTema(cambios.tema)
  ses.usuario = { ...ses.usuario, preferencias: nuevas }
  const u = await useServicios().usuarios.guardarPreferencias(ses.token, nuevas)
  if (estado.sesion) estado.sesion.usuario = u
}

/** Si el error es «sesión no válida», cierra la sesión. Devuelve true si lo manejó. */
function manejarNoAutenticado(e: unknown) {
  if (estadoError(e) !== 401) return false
  cerrar("expirada")
  return true
}

const usuario = computed(() => estado.sesion?.usuario ?? null)
const token = computed(() => estado.sesion?.token ?? "")
const esAdmin = computed(() => usuario.value?.rol === "administrador")

const api = {
  estado: readonly(estado),
  usuario,
  token,
  esAdmin,
  iniciar,
  cerrar,
  seguirConectado,
  actualizarUsuario,
  guardarPreferencias,
  manejarNoAutenticado,
}

export const useSesion = () => api

/** Para pantallas privadas: usuario y token garantizados. */
export function useUsuario() {
  return {
    usuario: computed(() => {
      if (!usuario.value) throw new Error("Sin sesión")
      return usuario.value
    }),
    token,
  }
}

import { useEffect, useState, type FormEvent } from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router"
import { KeyRound, LinkIcon } from "lucide-react"
import { mensajeError, useServicios, useSesion } from "@/application"
import { contrasenaSegura } from "@/domain/password"
import {
  Aviso,
  Boton,
  Campo,
  CampoContrasena,
  Cargando,
  ListaRequisitos,
  Vacio,
} from "@/shared/ui"
import { EncabezadoAuth, leerToken } from "./comunes"

export default function Restablecer() {
  const s = useServicios()
  const { usuario, cerrar } = useSesion()
  const loc = useLocation()
  const navegar = useNavigate()
  const token = leerToken(loc.search)
  const [validez, setValidez] = useState<{
    estado: "revisando" | "ok" | "confirmacion" | "invalido"
    mensaje?: string
  }>({ estado: "revisando" })
  const [nueva, setNueva] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [tocado, setTocado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token)
      return setValidez({
        estado: "invalido",
        mensaje:
          "El enlace está incompleto. Ábralo de nuevo desde el correo o solicite uno nuevo.",
      })
    s.auth
      .validarToken(token)
      .then((r) =>
        setValidez({
          estado: r.proposito === "recuperacion" ? "ok" : "confirmacion",
        }),
      )
      .catch((e) =>
        setValidez({ estado: "invalido", mensaje: mensajeError(e) }),
      )
  }, [s, token])

  if (validez.estado === "confirmacion")
    return (
      <Navigate
        to={`/cambiar-contrasena?token=${encodeURIComponent(token)}`}
        replace
      />
    )
  if (validez.estado === "revisando")
    return <Cargando texto="Revisando el enlace…" />
  if (validez.estado === "invalido") {
    return (
      <Vacio
        icono={<LinkIcon className="size-5" />}
        titulo="Este enlace ya no sirve"
        accion={
          <Link to="/recuperar">
            <Boton variante="primario">Solicitar un enlace nuevo</Boton>
          </Link>
        }
      >
        {validez.mensaje}
      </Vacio>
    )
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setTocado(true)
    if (!contrasenaSegura(nueva) || nueva !== confirmar) return
    setEnviando(true)
    setError(null)
    try {
      await s.auth.restablecerContrasena(token, nueva)
      // El servidor cierra todas las sesiones de la cuenta; si había una abierta aquí, se cierra también.
      if (usuario) await cerrar("manual")
      navegar("/ingresar?restablecida=1", { replace: true })
    } catch (err) {
      setError(mensajeError(err))
      setEnviando(false)
    }
  }

  return (
    <div className="animar-aparecer">
      <EncabezadoAuth
        titulo="Cree una contraseña nueva"
        descripcion="Al guardarla, se cerrarán las sesiones abiertas en otros equipos."
        icono={<KeyRound className="size-5" />}
      />
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Campo
          etiqueta="Contraseña nueva"
          htmlFor="nueva"
          error={
            tocado && !contrasenaSegura(nueva)
              ? "La contraseña aún no cumple todos los requisitos."
              : null
          }
        >
          <CampoContrasena
            id="nueva"
            autoComplete="new-password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            autoFocus
          />
        </Campo>
        <ListaRequisitos contrasena={nueva} />
        <Campo
          etiqueta="Repita la contraseña"
          htmlFor="confirmar"
          error={
            tocado && nueva !== confirmar
              ? "Las contraseñas no coinciden."
              : null
          }
        >
          <CampoContrasena
            id="confirmar"
            autoComplete="new-password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
          />
        </Campo>
        {error && <Aviso tono="peligro">{error}</Aviso>}
        <Boton
          type="submit"
          variante="primario"
          tamano="lg"
          className="w-full"
          cargando={enviando}
        >
          Guardar contraseña
        </Boton>
      </form>
    </div>
  )
}

import { useEffect, useState, type FormEvent } from "react"
import { Link, useLocation } from "react-router"
import { CheckCircle2, LinkIcon, ShieldCheck } from "lucide-react"
import {
  campoError,
  mensajeError,
  useServicios,
  useUsuario,
} from "@/application"
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

export default function CambiarContrasena() {
  const s = useServicios()
  const { token: sesion } = useUsuario()
  const loc = useLocation()
  const token = leerToken(loc.search)
  const [validez, setValidez] = useState<{
    estado: "revisando" | "ok" | "invalido"
    mensaje?: string
  }>({ estado: "revisando" })
  const [v, setV] = useState({ actual: "", nueva: "", confirmar: "" })
  const [tocado, setTocado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<{
    campo: string | null
    mensaje: string
  } | null>(null)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    if (!token)
      return setValidez({
        estado: "invalido",
        mensaje:
          "El enlace está incompleto. Solicite uno nuevo desde su perfil.",
      })
    s.auth
      .validarToken(token)
      .then((r) =>
        setValidez(
          r.proposito === "confirmacion"
            ? { estado: "ok" }
            : {
                estado: "invalido",
                mensaje:
                  "Este enlace es para recuperar la contraseña, no para cambiarla.",
              },
        ),
      )
      .catch((e) =>
        setValidez({ estado: "invalido", mensaje: mensajeError(e) }),
      )
  }, [s, token])

  if (validez.estado === "revisando")
    return <Cargando texto="Revisando el enlace…" />
  if (validez.estado === "invalido") {
    return (
      <Vacio
        icono={<LinkIcon className="size-5" />}
        titulo="Este enlace ya no sirve"
        accion={
          <Link to="/perfil">
            <Boton variante="primario">Ir a mi perfil</Boton>
          </Link>
        }
      >
        {validez.mensaje}
      </Vacio>
    )
  }
  if (listo) {
    return (
      <Vacio
        icono={<CheckCircle2 className="size-5 text-exito" />}
        titulo="Contraseña cambiada"
        accion={
          <Link to="/perfil">
            <Boton variante="primario">Volver a mi perfil</Boton>
          </Link>
        }
      >
        La próxima vez que ingrese, use su nueva contraseña.
      </Vacio>
    )
  }

  const errNueva = !contrasenaSegura(v.nueva)
    ? "La contraseña aún no cumple todos los requisitos."
    : v.nueva === v.actual
      ? "La contraseña nueva debe ser distinta de la actual."
      : null
  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setTocado(true)
    if (!v.actual || errNueva || v.nueva !== v.confirmar) return
    setEnviando(true)
    setError(null)
    try {
      await s.auth.cambiarContrasena(sesion, token, v.actual, v.nueva)
      setListo(true)
    } catch (err) {
      setError({ campo: campoError(err), mensaje: mensajeError(err) })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="animar-aparecer">
      <EncabezadoAuth
        titulo="Cambiar contraseña"
        descripcion="Confirme su contraseña actual y elija una nueva."
        icono={<ShieldCheck className="size-5" />}
      />
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Campo
          etiqueta="Contraseña actual"
          htmlFor="actual"
          error={
            error?.campo === "actual"
              ? error.mensaje
              : tocado && !v.actual
                ? "Escriba su contraseña actual."
                : null
          }
        >
          <CampoContrasena
            id="actual"
            autoComplete="current-password"
            value={v.actual}
            onChange={(e) => (
              setV({ ...v, actual: e.target.value }), setError(null)
            )}
            autoFocus
          />
        </Campo>
        <Campo
          etiqueta="Contraseña nueva"
          htmlFor="nueva"
          error={tocado ? errNueva : null}
        >
          <CampoContrasena
            id="nueva"
            autoComplete="new-password"
            value={v.nueva}
            onChange={(e) => setV({ ...v, nueva: e.target.value })}
          />
        </Campo>
        <ListaRequisitos contrasena={v.nueva} />
        <Campo
          etiqueta="Repita la contraseña nueva"
          htmlFor="confirmar"
          error={
            tocado && v.nueva !== v.confirmar
              ? "Las contraseñas no coinciden."
              : null
          }
        >
          <CampoContrasena
            id="confirmar"
            autoComplete="new-password"
            value={v.confirmar}
            onChange={(e) => setV({ ...v, confirmar: e.target.value })}
          />
        </Campo>
        {error && error.campo !== "actual" && (
          <Aviso tono="peligro">{error.mensaje}</Aviso>
        )}
        <div className="flex gap-2">
          <Link to="/perfil" className="flex-1">
            <Boton className="w-full" tamano="lg">
              Cancelar
            </Boton>
          </Link>
          <Boton
            type="submit"
            variante="primario"
            tamano="lg"
            className="flex-1"
            cargando={enviando}
          >
            Cambiar contraseña
          </Boton>
        </div>
      </form>
    </div>
  )
}

import { useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { ArrowRight } from "lucide-react"
import { mensajeError, useSesion } from "@/application"
import { correoValido } from "@/domain/contact"
import { Aviso, Boton, Campo, CampoContrasena, Entrada } from "@/shared/ui"
import { CuentasDemo, EncabezadoAuth } from "./comunes"

export default function Ingresar() {
  const { iniciar, motivoCierre } = useSesion()
  const loc = useLocation()
  const navegar = useNavigate()
  const params = new URLSearchParams(loc.search)
  const [correo, setCorreo] = useState(params.get("correo") ?? "")
  const [contrasena, setContrasena] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tocado, setTocado] = useState(false)

  const errorCorreo =
    tocado && correo && !correoValido(correo)
      ? "Revise el formato del correo (por ejemplo, nombre@skinlaser.cl)."
      : null

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setTocado(true)
    if (!correoValido(correo) || !contrasena) {
      setError("Ingrese su correo y su contraseña.")
      return
    }
    setEnviando(true)
    setError(null)
    try {
      await iniciar(correo, contrasena)
      const volver = params.get("volver")
      navegar(volver && volver.startsWith("/") ? volver : "/", {
        replace: true,
      })
    } catch (err) {
      setError(mensajeError(err))
      setEnviando(false)
    }
  }

  return (
    <div className="animar-aparecer">
      <EncabezadoAuth
        titulo="Ingresar"
        descripcion="Use el correo y la contraseña de su cuenta en el sistema."
      />
      {motivoCierre === "inactividad" && (
        <Aviso
          tono="info"
          titulo="Cerramos su sesión por inactividad"
          className="mb-5"
        >
          Pasaron 15 minutos sin actividad. Vuelva a ingresar para continuar.
        </Aviso>
      )}
      {motivoCierre === "expirada" && (
        <Aviso tono="info" titulo="Su sesión expiró" className="mb-5">
          Por seguridad, vuelva a ingresar.
        </Aviso>
      )}
      {params.get("registrado") && (
        <Aviso tono="exito" titulo="Cuenta creada" className="mb-5">
          Ya puede ingresar con su correo y contraseña.
        </Aviso>
      )}
      {params.get("restablecida") && (
        <Aviso tono="exito" titulo="Contraseña actualizada" className="mb-5">
          Ingrese con su nueva contraseña.
        </Aviso>
      )}
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Campo
          etiqueta="Correo electrónico"
          htmlFor="correo"
          error={errorCorreo}
        >
          <Entrada
            id="correo"
            type="email"
            autoComplete="username"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            onBlur={() => setTocado(true)}
            invalido={!!errorCorreo}
            placeholder="nombre@skinlaser.cl"
            autoFocus
            className="h-11"
          />
        </Campo>
        <Campo
          etiqueta="Contraseña"
          htmlFor="contrasena"
          accion={
            <Link
              to="/recuperar"
              className="text-[13px] text-acento hover:underline"
            >
              ¿Olvidó su contraseña?
            </Link>
          }
        >
          <CampoContrasena
            id="contrasena"
            autoComplete="current-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            className="h-11"
          />
        </Campo>
        {error && <Aviso tono="peligro">{error}</Aviso>}
        <Boton
          type="submit"
          variante="primario"
          tamano="lg"
          className="w-full"
          cargando={enviando}
          iconoDerecha={!enviando && <ArrowRight className="size-4" />}
        >
          Ingresar
        </Boton>
      </form>
      <div className="mt-6 flex flex-col gap-2 text-center text-[13.5px] text-suave">
        <p>
          ¿No recuerda con qué correo se registró?{" "}
          <Link
            to="/recuperar?modo=correo"
            className="text-acento hover:underline"
          >
            Recupérelo con su teléfono
          </Link>
        </p>
        <p>
          ¿Aún no tiene cuenta?{" "}
          <Link
            to="/registro"
            className="font-medium text-acento hover:underline"
          >
            Crear una cuenta
          </Link>
        </p>
      </div>
      <CuentasDemo
        alElegir={(c) => {
          setCorreo(c.correo)
          setContrasena(c.contrasena)
          setError(null)
        }}
      />
    </div>
  )
}

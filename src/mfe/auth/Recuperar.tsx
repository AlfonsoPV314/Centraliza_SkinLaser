import { useState, type FormEvent } from "react"
import { Link, useSearchParams } from "react-router"
import { ArrowLeft, Inbox, MailQuestion } from "lucide-react"
import { mensajeError, useServicios } from "@/application"
import type { CanalMensaje } from "@/contracts"
import { CARACTERISTICAS } from "@/config/features"
import { celularValido, correoValido } from "@/domain/contact"
import { Aviso, Boton, Campo, Entrada, Segmentado } from "@/shared/ui"
import { EncabezadoAuth } from "./comunes"

export default function Recuperar() {
  const s = useServicios()
  const [params, setParams] = useSearchParams()
  const modo =
    params.get("modo") === "correo" &&
    CARACTERISTICAS.recuperarCorreoPorTelefono
      ? "correo"
      : "contrasena"
  const canales = (["sms", "whatsapp"] as const).filter(
    (c) => CARACTERISTICAS.notificaciones[c],
  )
  const [correo, setCorreo] = useState("")
  const [telefono, setTelefono] = useState("")
  const [canal, setCanal] = useState<CanalMensaje>(canales[0] ?? "sms")
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cambiarModo = (m: string) => {
    setParams(m === "correo" ? { modo: "correo" } : {}, { replace: true })
    setEnviado(false)
    setError(null)
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (modo === "contrasena" && !correoValido(correo))
      return setError("Escriba el correo con el que ingresa al sistema.")
    if (modo === "correo" && !celularValido(telefono))
      return setError(
        "Escriba un celular chileno de 9 dígitos que empiece con 9.",
      )
    setEnviando(true)
    try {
      if (modo === "contrasena")
        await s.auth.solicitarRecuperacionContrasena(correo)
      else await s.auth.recuperarCorreo(telefono, canal)
      setEnviado(true)
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="animar-aparecer">
      <Link
        to="/ingresar"
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-suave hover:text-texto"
      >
        <ArrowLeft className="size-4" /> Volver a ingresar
      </Link>
      <EncabezadoAuth
        titulo="Recuperar acceso"
        descripcion="Elija qué necesita recuperar. Por seguridad, no confirmamos si un correo o teléfono está registrado."
        icono={<MailQuestion className="size-5" />}
      />
      {CARACTERISTICAS.recuperarCorreoPorTelefono && (
        <Segmentado
          className="mb-6 w-full [&>button]:flex-1"
          etiqueta="Qué recuperar"
          valor={modo}
          alCambiar={cambiarModo}
          opciones={[
            { valor: "contrasena", etiqueta: "Olvidé mi contraseña" },
            { valor: "correo", etiqueta: "Olvidé mi correo" },
          ]}
        />
      )}
      {enviado ? (
        <div className="space-y-4">
          <Aviso
            tono="exito"
            titulo={
              modo === "contrasena"
                ? "Revise su correo"
                : `Revise su ${canal === "sms" ? "SMS" : "WhatsApp"}`
            }
          >
            {modo === "contrasena"
              ? `Si ${correo.trim()} está registrado, le enviamos un enlace para crear una nueva contraseña. Vence en 30 minutos.`
              : `Si el número está asociado a una cuenta, le enviamos el correo con el que ingresa.`}
          </Aviso>
          <p className="flex items-start gap-2 text-[13px] text-suave">
            <Inbox className="mt-0.5 size-4 shrink-0 text-acento" />
            En este prototipo, los mensajes llegan al «Buzón de prueba» (abajo a
            la izquierda).
          </p>
          <Boton className="w-full" onClick={() => setEnviado(false)}>
            Enviar de nuevo
          </Boton>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-4" noValidate>
          {modo === "contrasena" ? (
            <Campo
              etiqueta="Correo electrónico"
              htmlFor="correo"
              ayuda="Le enviaremos un enlace para crear una contraseña nueva."
            >
              <Entrada
                id="correo"
                type="email"
                autoComplete="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                autoFocus
                className="h-11"
              />
            </Campo>
          ) : (
            <>
              <Campo etiqueta="Teléfono celular registrado" htmlFor="telefono">
                <Entrada
                  id="telefono"
                  type="tel"
                  inputMode="tel"
                  placeholder="+56 9 1234 5678"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  autoFocus
                  className="h-11"
                />
              </Campo>
              {canales.length > 1 && (
                <Campo etiqueta="¿Cómo prefiere recibirlo?">
                  <Segmentado
                    valor={canal}
                    alCambiar={setCanal}
                    etiqueta="Canal"
                    opciones={canales.map((c) => ({
                      valor: c,
                      etiqueta: c === "sms" ? "SMS" : "WhatsApp",
                    }))}
                  />
                </Campo>
              )}
            </>
          )}
          {error && <Aviso tono="peligro">{error}</Aviso>}
          <Boton
            type="submit"
            variante="primario"
            tamano="lg"
            className="w-full"
            cargando={enviando}
          >
            {modo === "contrasena" ? "Enviar enlace" : "Enviar mi correo"}
          </Boton>
        </form>
      )}
    </div>
  )
}

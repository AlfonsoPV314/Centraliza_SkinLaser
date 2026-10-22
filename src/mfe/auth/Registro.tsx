import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { Check, LoaderCircle } from "lucide-react"
import { campoError, mensajeError, useServicios } from "@/application"
import {
  celularValido,
  correoValido,
  normalizarTelefono,
} from "@/domain/contact"
import { contrasenaSegura } from "@/domain/password"
import {
  Aviso,
  Boton,
  Campo,
  CampoContrasena,
  Entrada,
  ListaRequisitos,
} from "@/shared/ui"
import { EncabezadoAuth } from "./comunes"

type Campos = "nombre" | "correo" | "telefono" | "contrasena" | "confirmar"

export default function Registro() {
  const s = useServicios()
  const navegar = useNavigate()
  const [v, setV] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    contrasena: "",
    confirmar: "",
  })
  const [tocados, setTocados] = useState<Partial<Record<Campos, boolean>>>({})
  const [disponible, setDisponible] = useState<"?" | "revisando" | "si" | "no">(
    "?",
  )
  const [enviando, setEnviando] = useState(false)
  const [errorServidor, setErrorServidor] = useState<{
    campo: string | null
    mensaje: string
  } | null>(null)

  const errores: Record<Campos, string | null> = {
    nombre:
      v.nombre.trim().length < 3
        ? "Escriba su nombre (al menos 3 letras)."
        : null,
    correo: !correoValido(v.correo)
      ? "Escriba un correo válido, por ejemplo nombre@skinlaser.cl."
      : disponible === "no"
        ? "Ya existe una cuenta con este correo. ¿Quiere ingresar o recuperar su contraseña?"
        : null,
    telefono: !celularValido(v.telefono)
      ? "Escriba un celular chileno de 9 dígitos que empiece con 9 (por ejemplo, 9 1234 5678)."
      : null,
    contrasena: !contrasenaSegura(v.contrasena)
      ? "La contraseña aún no cumple todos los requisitos."
      : null,
    confirmar:
      v.confirmar !== v.contrasena ? "Las contraseñas no coinciden." : null,
  }
  const mostrar = (c: Campos) =>
    (tocados[c] ? errores[c] : null) ??
    (errorServidor?.campo === (c === "nombre" ? "nombreUsuario" : c)
      ? errorServidor.mensaje
      : null)
  const cambiar = (c: Campos) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setV((x) => ({ ...x, [c]: e.target.value }))
    if (c === "correo") setDisponible("?")
    if (errorServidor) setErrorServidor(null)
  }
  const tocar = (c: Campos) => () => setTocados((t) => ({ ...t, [c]: true }))

  const revisarCorreo = async () => {
    tocar("correo")()
    if (!correoValido(v.correo)) return
    setDisponible("revisando")
    try {
      setDisponible((await s.auth.correoDisponible(v.correo)) ? "si" : "no")
    } catch {
      setDisponible("?")
    }
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setTocados({
      nombre: true,
      correo: true,
      telefono: true,
      contrasena: true,
      confirmar: true,
    })
    if (Object.values(errores).some(Boolean)) return
    setEnviando(true)
    try {
      await s.auth.registrar({
        nombreUsuario: v.nombre.trim(),
        correo: v.correo,
        telefono: normalizarTelefono(v.telefono)!,
        contrasena: v.contrasena,
      })
      navegar(
        `/ingresar?registrado=1&correo=${encodeURIComponent(v.correo.trim().toLowerCase())}`,
        { replace: true },
      )
    } catch (err) {
      setErrorServidor({ campo: campoError(err), mensaje: mensajeError(err) })
      setEnviando(false)
    }
  }

  return (
    <div className="animar-aparecer">
      <EncabezadoAuth
        titulo="Crear una cuenta"
        descripcion="Le pediremos un teléfono celular para que pueda recuperar su acceso si olvida el correo."
      />
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Campo
          etiqueta="Nombre y apellido"
          htmlFor="nombre"
          error={mostrar("nombre")}
        >
          <Entrada
            id="nombre"
            autoComplete="name"
            value={v.nombre}
            onChange={cambiar("nombre")}
            onBlur={tocar("nombre")}
            invalido={!!mostrar("nombre")}
            autoFocus
          />
        </Campo>
        <Campo
          etiqueta="Correo electrónico"
          htmlFor="correo"
          error={mostrar("correo")}
          ayuda={
            disponible === "si" ? undefined : "Será su usuario para ingresar."
          }
        >
          <Entrada
            id="correo"
            type="email"
            autoComplete="email"
            value={v.correo}
            onChange={cambiar("correo")}
            onBlur={revisarCorreo}
            invalido={!!mostrar("correo")}
            sufijo={
              disponible === "revisando" ? (
                <LoaderCircle className="mr-2 size-4 animate-spin text-tenue" />
              ) : disponible === "si" ? (
                <Check
                  className="mr-2 size-4 text-exito"
                  aria-label="Correo disponible"
                />
              ) : undefined
            }
          />
        </Campo>
        <Campo
          etiqueta="Teléfono celular"
          htmlFor="telefono"
          error={mostrar("telefono")}
          ayuda="Se usa para recuperar su correo por SMS o WhatsApp."
        >
          <Entrada
            id="telefono"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+56 9 1234 5678"
            value={v.telefono}
            onChange={cambiar("telefono")}
            onBlur={tocar("telefono")}
            invalido={!!mostrar("telefono")}
          />
        </Campo>
        <Campo
          etiqueta="Contraseña"
          htmlFor="contrasena"
          error={
            tocados.contrasena && v.contrasena && errores.contrasena
              ? errores.contrasena
              : null
          }
        >
          <CampoContrasena
            id="contrasena"
            autoComplete="new-password"
            value={v.contrasena}
            onChange={cambiar("contrasena")}
            onBlur={tocar("contrasena")}
            invalido={!!(tocados.contrasena && errores.contrasena)}
          />
        </Campo>
        <ListaRequisitos contrasena={v.contrasena} />
        <Campo
          etiqueta="Repita la contraseña"
          htmlFor="confirmar"
          error={tocados.confirmar ? errores.confirmar : null}
        >
          <CampoContrasena
            id="confirmar"
            autoComplete="new-password"
            value={v.confirmar}
            onChange={cambiar("confirmar")}
            onBlur={tocar("confirmar")}
            invalido={!!(tocados.confirmar && errores.confirmar)}
          />
        </Campo>
        {errorServidor &&
          !["correo", "telefono", "contrasena", "nombreUsuario"].includes(
            errorServidor.campo ?? "",
          ) && <Aviso tono="peligro">{errorServidor.mensaje}</Aviso>}
        <Boton
          type="submit"
          variante="primario"
          tamano="lg"
          className="w-full"
          cargando={enviando}
        >
          Crear cuenta
        </Boton>
      </form>
      <p className="mt-6 text-center text-[13.5px] text-suave">
        ¿Ya tiene cuenta?{" "}
        <Link
          to="/ingresar"
          className="font-medium text-acento hover:underline"
        >
          Ingresar
        </Link>
      </p>
    </div>
  )
}

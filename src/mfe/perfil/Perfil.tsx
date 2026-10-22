import { useState, type FormEvent, type ReactNode } from "react"
import {
  FolderDown,
  KeyRound,
  Mail,
  Monitor,
  Moon,
  Phone,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react"
import {
  mensajeError,
  useInformarError,
  useServicios,
  useSesion,
  useUsuario,
} from "@/application"
import type { CanalMensaje, SolicitudVerificacion } from "@/contracts"
import { CARACTERISTICAS } from "@/config/features"
import {
  celularValido,
  correoValido,
  formatearTelefono,
  normalizarTelefono,
} from "@/domain/contact"
import {
  carpetaDisponible,
  elegirCarpeta,
  olvidarCarpeta,
} from "@/infrastructure/descargas"
import { useCuentaRegresiva } from "@/shared/hooks"
import {
  Aviso,
  Boton,
  Campo,
  Dialogo,
  EncabezadoPagina,
  EncabezadoTarjeta,
  Entrada,
  Insignia,
  Segmentado,
  Selector,
  Tarjeta,
  useNotificar,
} from "@/shared/ui"

export default function Perfil() {
  const { usuario } = useUsuario()
  const [dialogo, setDialogo] = useState<"correo" | "telefono" | null>(null)
  const iniciales = usuario.nombreUsuario
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()

  return (
    <div className="animar-aparecer mx-auto max-w-3xl">
      <EncabezadoPagina
        titulo="Mi perfil y preferencias"
        descripcion="Sus datos de acceso y cómo prefiere trabajar con el sistema."
      />
      <Tarjeta className="mb-6 flex flex-wrap items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-full bg-acento-tenue text-[18px] font-semibold text-acento">
          {iniciales}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[18px] font-semibold tracking-tight">
            {usuario.nombreUsuario}
          </p>
          <p className="truncate text-[13.5px] text-suave">{usuario.correo}</p>
        </div>
        <Insignia
          tono={usuario.rol === "administrador" ? "acento" : "neutro"}
          icono={<ShieldCheck className="size-3.5" />}
        >
          {usuario.rol === "administrador" ? "Administrador" : "Usuario"}
        </Insignia>
      </Tarjeta>

      <div className="space-y-6">
        <DatosPersonales />
        <Tarjeta>
          <EncabezadoTarjeta
            titulo="Datos de contacto"
            descripcion="Los cambios se confirman con un código enviado al otro medio, para que nadie más pueda hacerlos."
            icono={<Mail className="size-4" />}
          />
          <div className="divide-y divide-borde">
            <FilaContacto
              icono={<Mail className="size-4" />}
              etiqueta="Correo electrónico"
              valor={usuario.correo}
              detalle={
                usuario.correoVerificado
                  ? "Verificado · se usa para ingresar"
                  : "Sin verificar"
              }
              alCambiar={() => setDialogo("correo")}
            />
            <FilaContacto
              icono={<Phone className="size-4" />}
              etiqueta="Teléfono celular"
              valor={formatearTelefono(usuario.telefono)}
              detalle="Para recuperar su correo y recibir códigos"
              alCambiar={() => setDialogo("telefono")}
            />
          </div>
        </Tarjeta>
        <Seguridad />
        <Preferencias />
      </div>

      <DialogoCambio tipo={dialogo} alCerrar={() => setDialogo(null)} />
    </div>
  )
}

function DatosPersonales() {
  const s = useServicios()
  const { token, usuario } = useUsuario()
  const { actualizarUsuario } = useSesion()
  const notificar = useNotificar()
  const [nombre, setNombre] = useState(usuario.nombreUsuario)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cambiado = nombre.trim() !== usuario.nombreUsuario

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    if (nombre.trim().length < 3)
      return setError("Escriba su nombre (al menos 3 letras).")
    setGuardando(true)
    setError(null)
    try {
      actualizarUsuario(
        await s.usuarios.actualizarPerfil(token, {
          nombreUsuario: nombre.trim(),
        }),
      )
      notificar({ tono: "exito", titulo: "Nombre actualizado" })
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Tarjeta>
      <EncabezadoTarjeta
        titulo="Datos personales"
        icono={<UserRound className="size-4" />}
      />
      <form
        onSubmit={guardar}
        className="flex flex-wrap items-start gap-3"
        noValidate
      >
        <Campo
          etiqueta="Nombre y apellido"
          htmlFor="nombre"
          error={error}
          className="min-w-60 flex-1"
        >
          <Entrada
            id="nombre"
            value={nombre}
            onChange={(e) => (setNombre(e.target.value), setError(null))}
            autoComplete="name"
            invalido={!!error}
          />
        </Campo>
        <div className="flex gap-2 sm:pt-[26px]">
          {cambiado && (
            <Boton onClick={() => setNombre(usuario.nombreUsuario)}>
              Descartar
            </Boton>
          )}
          <Boton
            type="submit"
            variante="primario"
            disabled={!cambiado}
            cargando={guardando}
          >
            Guardar
          </Boton>
        </div>
      </form>
    </Tarjeta>
  )
}

function FilaContacto({
  icono,
  etiqueta,
  valor,
  detalle,
  alCambiar,
}: {
  icono: ReactNode
  etiqueta: string
  valor: string
  detalle: string
  alCambiar: () => void
}) {
  return (
    <div className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-superficie-2 text-tenue">
        {icono}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] text-tenue">{etiqueta}</p>
        <p className="truncate text-[14.5px] font-medium">{valor}</p>
        <p className="text-[12px] text-tenue">{detalle}</p>
      </div>
      <Boton tamano="sm" onClick={alCambiar}>
        Cambiar
      </Boton>
    </div>
  )
}

function DialogoCambio({
  tipo,
  alCerrar,
}: {
  tipo: "correo" | "telefono" | null
  alCerrar: () => void
}) {
  const s = useServicios()
  const { token, usuario } = useUsuario()
  const { actualizarUsuario } = useSesion()
  const notificar = useNotificar()
  const canales = (["sms", "whatsapp"] as const).filter(
    (c) => CARACTERISTICAS.notificaciones[c],
  )
  const [valor, setValor] = useState("")
  const [canal, setCanal] = useState<CanalMensaje>(canales[0] ?? "sms")
  const [solicitud, setSolicitud] = useState<SolicitudVerificacion | null>(null)
  const [codigo, setCodigo] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const espera = useCuentaRegresiva(solicitud?.reenviarDesde)

  const cerrar = () => {
    setValor("")
    setSolicitud(null)
    setCodigo("")
    setError(null)
    alCerrar()
  }

  const pedir = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (tipo === "correo" && !correoValido(valor))
      return setError(
        "Escriba un correo válido, por ejemplo nombre@skinlaser.cl.",
      )
    if (tipo === "telefono" && !celularValido(valor))
      return setError(
        "Escriba un celular chileno de 9 dígitos que empiece con 9.",
      )
    setOcupado(true)
    try {
      setSolicitud(
        tipo === "correo"
          ? await s.usuarios.solicitarCambioCorreo(token, valor, canal)
          : await s.usuarios.solicitarCambioTelefono(
              token,
              normalizarTelefono(valor)!,
            ),
      )
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setOcupado(false)
    }
  }

  const confirmar = async (e: FormEvent) => {
    e.preventDefault()
    if (!solicitud) return
    if (!/^\d{6}$/.test(codigo.trim()))
      return setError("El código tiene 6 dígitos.")
    setOcupado(true)
    setError(null)
    try {
      actualizarUsuario(
        await s.usuarios.confirmarCodigo(
          token,
          solicitud.solicitudId,
          codigo.trim(),
        ),
      )
      notificar({
        tono: "exito",
        titulo:
          tipo === "correo" ? "Correo actualizado" : "Teléfono actualizado",
        detalle:
          tipo === "correo"
            ? "Use el nuevo correo la próxima vez que ingrese."
            : undefined,
      })
      cerrar()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setOcupado(false)
    }
  }

  const reenviar = async () => {
    if (!solicitud) return
    setError(null)
    try {
      setSolicitud(
        await s.usuarios.reenviarCodigo(token, solicitud.solicitudId),
      )
      notificar({ tono: "info", titulo: "Le enviamos un código nuevo" })
    } catch (err) {
      setError(mensajeError(err))
    }
  }

  const destino =
    solicitud?.canal === "correo"
      ? "correo"
      : solicitud?.canal === "whatsapp"
        ? "WhatsApp"
        : "SMS"

  return (
    <Dialogo
      abierto={!!tipo}
      alCerrar={() => !ocupado && cerrar()}
      ancho="sm"
      titulo={
        tipo === "correo"
          ? "Cambiar correo electrónico"
          : "Cambiar teléfono celular"
      }
      descripcion={
        solicitud
          ? `Escriba el código de 6 dígitos que enviamos por ${destino} a ${solicitud.destinoEnmascarado}.`
          : tipo === "correo"
            ? `Le enviaremos un código a su teléfono ${formatearTelefono(usuario.telefono)} para confirmar el cambio.`
            : `Le enviaremos un código a su correo ${usuario.correo} para confirmar el cambio.`
      }
    >
      {!solicitud ? (
        <form onSubmit={pedir} className="space-y-4" noValidate>
          {tipo === "correo" ? (
            <Campo etiqueta="Nuevo correo" htmlFor="nuevo" error={error}>
              <Entrada
                id="nuevo"
                type="email"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                autoFocus
                invalido={!!error}
              />
            </Campo>
          ) : (
            <Campo etiqueta="Nuevo celular" htmlFor="nuevo" error={error}>
              <Entrada
                id="nuevo"
                type="tel"
                inputMode="tel"
                placeholder="+56 9 1234 5678"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                autoFocus
                invalido={!!error}
              />
            </Campo>
          )}
          {tipo === "correo" && canales.length > 1 && (
            <Campo etiqueta="Recibir el código por">
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
          <div className="flex justify-end gap-2 pt-1">
            <Boton onClick={cerrar}>Cancelar</Boton>
            <Boton type="submit" variante="primario" cargando={ocupado}>
              Enviar código
            </Boton>
          </div>
        </form>
      ) : (
        <form onSubmit={confirmar} className="space-y-4" noValidate>
          <Campo
            etiqueta="Código de verificación"
            htmlFor="codigo"
            error={error}
          >
            <Entrada
              id="codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
              autoFocus
              invalido={!!error}
              className="h-12 text-center font-mono text-[20px] tracking-[0.5em]"
            />
          </Campo>
          <p className="text-[12.5px] text-tenue">
            En este prototipo, el código llega al «Buzón de prueba».
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Boton variante="enlace" onClick={reenviar} disabled={espera > 0}>
              {espera > 0 ? `Reenviar en ${espera} s` : "Reenviar código"}
            </Boton>
            <div className="flex gap-2">
              <Boton onClick={cerrar}>Cancelar</Boton>
              <Boton type="submit" variante="primario" cargando={ocupado}>
                Confirmar
              </Boton>
            </div>
          </div>
        </form>
      )}
    </Dialogo>
  )
}

function Seguridad() {
  const s = useServicios()
  const { token, usuario } = useUsuario()
  const informar = useInformarError()
  const [enviado, setEnviado] =
    useState<"confirmacion" | "recuperacion" | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  const pedir = async (modo: "confirmacion" | "recuperacion") => {
    setOcupado(modo)
    try {
      await s.usuarios.solicitarEnlaceContrasena(token, modo)
      setEnviado(modo)
    } catch (e) {
      informar(e, "No se pudo enviar el enlace")
    } finally {
      setOcupado(null)
    }
  }

  return (
    <Tarjeta>
      <EncabezadoTarjeta
        titulo="Contraseña"
        descripcion="Por seguridad, el cambio se hace desde un enlace que enviamos a su correo."
        icono={<KeyRound className="size-4" />}
      />
      {enviado && (
        <Aviso tono="exito" titulo="Revise su correo" className="mb-4">
          Enviamos un enlace a {usuario.correo}.{" "}
          {enviado === "confirmacion"
            ? "Ahí podrá elegir una contraseña nueva confirmando la actual."
            : "Ahí podrá crear una contraseña nueva sin la actual."}{" "}
          En el prototipo, llega al «Buzón de prueba».
        </Aviso>
      )}
      <div className="flex flex-wrap gap-2">
        <Boton
          variante="primario"
          cargando={ocupado === "confirmacion"}
          onClick={() => pedir("confirmacion")}
        >
          Cambiar contraseña
        </Boton>
        <Boton
          variante="fantasma"
          cargando={ocupado === "recuperacion"}
          onClick={() => pedir("recuperacion")}
        >
          No recuerdo mi contraseña actual
        </Boton>
      </div>
    </Tarjeta>
  )
}

function Preferencias() {
  const { usuario } = useUsuario()
  const { guardarPreferencias } = useSesion()
  const informar = useInformarError()
  const notificar = useNotificar()
  const p = usuario.preferencias
  const guardar = (c: Partial<typeof p>) =>
    guardarPreferencias(c).catch((e) =>
      informar(e, "No se guardó la preferencia"),
    )

  const elegir = async () => {
    const nombre = await elegirCarpeta()
    if (nombre) {
      await guardar({ carpetaDescarga: nombre })
      notificar({
        tono: "exito",
        titulo: "Carpeta elegida",
        detalle: `Los reportes se guardarán en «${nombre}».`,
      })
    }
  }

  return (
    <Tarjeta>
      <EncabezadoTarjeta
        titulo="Preferencias"
        descripcion="Se guardan en su cuenta y se aplican en cualquier equipo."
        icono={<Monitor className="size-4" />}
      />
      <div className="divide-y divide-borde">
        <Preferencia etiqueta="Tema" detalle="Apariencia de la aplicación.">
          <Segmentado
            etiqueta="Tema"
            valor={p.tema}
            alCambiar={(tema) => guardar({ tema })}
            opciones={[
              {
                valor: "oscuro",
                etiqueta: "Oscuro",
                icono: <Moon className="size-3.5" />,
              },
              {
                valor: "claro",
                etiqueta: "Claro",
                icono: <Sun className="size-3.5" />,
              },
            ]}
          />
        </Preferencia>
        <Preferencia
          etiqueta="Filas por página"
          detalle="En listados de datos y plantillas."
        >
          <Selector
            value={p.porPagina}
            onChange={(e) => guardar({ porPagina: Number(e.target.value) })}
            className="w-28"
            aria-label="Filas por página"
          >
            {[12, 24, 48, 96].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Selector>
        </Preferencia>
        <Preferencia
          etiqueta="Vista de plantillas"
          detalle="Cómo se muestran los reportes guardados."
        >
          <Segmentado
            etiqueta="Vista de plantillas"
            valor={p.vistaPlantillas}
            alCambiar={(vistaPlantillas) => guardar({ vistaPlantillas })}
            opciones={[
              { valor: "tarjetas", etiqueta: "Tarjetas" },
              { valor: "filas", etiqueta: "Lista" },
            ]}
          />
        </Preferencia>
        {CARACTERISTICAS.carpetaDescarga && (
          <Preferencia
            etiqueta="Carpeta para reportes"
            detalle={
              carpetaDisponible()
                ? p.carpetaDescarga
                  ? `Se guardan en «${p.carpetaDescarga}».`
                  : "Si no elige una, se usan las descargas del navegador."
                : "Este navegador no permite elegir carpeta; se usan las descargas."
            }
          >
            <div className="flex gap-2">
              {p.carpetaDescarga && (
                <Boton
                  variante="fantasma"
                  onClick={async () => (
                    await olvidarCarpeta(), guardar({ carpetaDescarga: null })
                  )}
                >
                  Quitar
                </Boton>
              )}
              <Boton
                icono={<FolderDown className="size-4" />}
                onClick={elegir}
                disabled={!carpetaDisponible()}
              >
                {p.carpetaDescarga ? "Cambiar" : "Elegir carpeta"}
              </Boton>
            </div>
          </Preferencia>
        )}
      </div>
    </Tarjeta>
  )
}

function Preferencia({
  etiqueta,
  detalle,
  children,
}: {
  etiqueta: string
  detalle: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-[14px] font-medium">{etiqueta}</p>
        <p className="text-[12.5px] text-tenue">{detalle}</p>
      </div>
      {children}
    </div>
  )
}

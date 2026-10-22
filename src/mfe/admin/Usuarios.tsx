import { useState, type FormEvent } from "react"
import {
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from "lucide-react"
import {
  campoError,
  mensajeError,
  useInformarError,
  useServicios,
  useUsuario,
} from "@/application"
import type { Rol, Usuario } from "@/contracts"
import {
  celularValido,
  correoValido,
  formatearTelefono,
  normalizarTelefono,
} from "@/domain/contact"
import { useCarga, useRetardo } from "@/shared/hooks"
import { tiempoRelativo } from "@/shared/presentacion"
import {
  Aviso,
  Boton,
  Campo,
  Dialogo,
  EncabezadoPagina,
  Entrada,
  Esqueleto,
  Insignia,
  Interruptor,
  Paginacion,
  Segmentado,
  Tarjeta,
  Vacio,
  cn,
  useNotificar,
} from "@/shared/ui"

const POR_PAGINA = 10

/** Contraseña temporal que cumple los requisitos (mayúscula, minúscula, número, símbolo, 10+). */
function contrasenaTemporal() {
  const al = (s: string) =>
    s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length]
  const base = [
    al("ABCDEFGHJKLMNPQRSTUVWXYZ"),
    al("abcdefghijkmnopqrstuvwxyz"),
    al("23456789"),
    al("#$%&*!?"),
  ]
  for (let i = 0; i < 8; i++)
    base.push(al("ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"))
  return base
    .sort(() => (crypto.getRandomValues(new Uint8Array(1))[0] > 127 ? 1 : -1))
    .join("")
}

export default function Usuarios() {
  const s = useServicios()
  const { token, usuario: yo } = useUsuario()
  const informar = useInformarError()
  const notificar = useNotificar()
  const [q, setQ] = useState("")
  const [pagina, setPagina] = useState(1)
  const busqueda = useRetardo(q)
  const lista = useCarga(
    () => s.usuarios.listar(token, busqueda, { pagina, porPagina: POR_PAGINA }),
    [s, token, busqueda, pagina],
  )
  const [editando, setEditando] = useState<Usuario | "nuevo" | null>(null)
  const [eliminando, setEliminando] = useState<Usuario | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const alternarActivo = async (u: Usuario) => {
    try {
      await s.usuarios.actualizar(token, u.id, { activo: !u.activo })
      notificar({
        tono: "exito",
        titulo: u.activo
          ? `Se desactivó a ${u.nombreUsuario}`
          : `Se activó a ${u.nombreUsuario}`,
      })
      lista.recargar(true)
    } catch (e) {
      informar(e)
    }
  }

  const eliminar = async () => {
    if (!eliminando) return
    setOcupado(true)
    try {
      await s.usuarios.eliminar(token, eliminando.id)
      notificar({ tono: "exito", titulo: "Usuario eliminado" })
      setEliminando(null)
      lista.recargar(true)
    } catch (e) {
      informar(e, "No se pudo eliminar")
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="animar-aparecer">
      <EncabezadoPagina
        titulo="Usuarios y roles"
        descripcion="Quién puede ingresar al sistema. Los administradores además gestionan las cuentas."
        acciones={
          <Boton
            variante="primario"
            icono={<Plus className="size-4" />}
            onClick={() => setEditando("nuevo")}
          >
            Nuevo usuario
          </Boton>
        }
      />
      <div className="mb-4 max-w-sm">
        <Entrada
          prefijo={<Search className="size-4" />}
          placeholder="Buscar por nombre o correo"
          value={q}
          onChange={(e) => (setQ(e.target.value), setPagina(1))}
          aria-label="Buscar usuarios"
        />
      </div>
      <Tarjeta relleno={false} className="overflow-hidden">
        {lista.cargando && !lista.datos ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Esqueleto key={i} className="h-12" />
            ))}
          </div>
        ) : lista.error ? (
          <Vacio
            titulo="No pudimos cargar los usuarios"
            accion={
              <Boton
                icono={<RefreshCw className="size-4" />}
                onClick={() => lista.recargar()}
              >
                Reintentar
              </Boton>
            }
          >
            {mensajeError(lista.error)}
          </Vacio>
        ) : !lista.datos?.items.length ? (
          <Vacio
            icono={<Users className="size-5" />}
            titulo={
              q ? "Nadie coincide con la búsqueda" : "Aún no hay usuarios"
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13.5px]">
              <thead className="border-b border-borde bg-superficie-2 text-[12px] text-tenue">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Nombre</th>
                  <th className="px-4 py-2.5 font-medium">Contacto</th>
                  <th className="px-4 py-2.5 font-medium">Rol</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde">
                {lista.datos.items.map((u) => {
                  const esYo = u.id === yo.id
                  return (
                    <tr
                      key={u.id}
                      className={cn(
                        "transition-colors hover:bg-superficie-2/60",
                        !u.activo && "text-tenue",
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-superficie-3 text-[12px] font-semibold">
                            {u.nombreUsuario
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((p) => p[0])
                              .join("")
                              .toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-texto">
                              {u.nombreUsuario}{" "}
                              {esYo && (
                                <span className="text-[12px] font-normal text-tenue">
                                  (usted)
                                </span>
                              )}
                            </p>
                            <p className="text-[12px] text-tenue">
                              Creado {tiempoRelativo(u.creadoEn)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p>{u.correo}</p>
                        <p className="num text-[12px] text-tenue">
                          {formatearTelefono(u.telefono)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {u.rol === "administrador" ? (
                          <Insignia
                            tono="acento"
                            icono={<ShieldCheck className="size-3" />}
                          >
                            Administrador
                          </Insignia>
                        ) : (
                          <Insignia icono={<UserRound className="size-3" />}>
                            Usuario
                          </Insignia>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={esYo}
                          onClick={() => alternarActivo(u)}
                          className="disabled:cursor-not-allowed"
                          title={
                            esYo
                              ? "No puede desactivar su propia cuenta"
                              : u.activo
                                ? "Desactivar"
                                : "Activar"
                          }
                        >
                          <Insignia tono={u.activo ? "exito" : "neutro"}>
                            {u.activo ? "Activo" : "Desactivado"}
                          </Insignia>
                        </button>
                        {!u.correoVerificado && (
                          <p className="mt-1 text-[11.5px] text-aviso">
                            Correo sin verificar
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Boton
                            tamano="sm"
                            variante="fantasma"
                            soloIcono
                            aria-label={`Editar a ${u.nombreUsuario}`}
                            icono={<Pencil className="size-3.5" />}
                            onClick={() => setEditando(u)}
                          />
                          <Boton
                            tamano="sm"
                            variante="fantasma"
                            soloIcono
                            aria-label={`Eliminar a ${u.nombreUsuario}`}
                            icono={<Trash2 className="size-3.5" />}
                            disabled={esYo}
                            onClick={() => setEliminando(u)}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
      {lista.datos && (
        <Paginacion
          className="mt-4"
          pagina={pagina}
          total={lista.datos.total}
          porPagina={POR_PAGINA}
          alCambiar={setPagina}
        />
      )}

      {editando && (
        <FormularioUsuario
          usuario={editando === "nuevo" ? null : editando}
          esYo={editando !== "nuevo" && editando.id === yo.id}
          alCerrar={() => setEditando(null)}
          alGuardar={() => (setEditando(null), lista.recargar(true))}
        />
      )}

      <Dialogo
        abierto={!!eliminando}
        alCerrar={() => !ocupado && setEliminando(null)}
        ancho="sm"
        titulo={`¿Eliminar a ${eliminando?.nombreUsuario}?`}
        descripcion="Perderá el acceso de inmediato. Los datos que cargó se conservan. Si solo quiere quitarle el acceso por un tiempo, desactívelo."
        pie={
          <>
            <Boton onClick={() => setEliminando(null)} disabled={ocupado}>
              Cancelar
            </Boton>
            <Boton variante="peligro" cargando={ocupado} onClick={eliminar}>
              Eliminar
            </Boton>
          </>
        }
      />
    </div>
  )
}

function FormularioUsuario({
  usuario,
  esYo,
  alCerrar,
  alGuardar,
}: {
  usuario: Usuario | null
  esYo: boolean
  alCerrar: () => void
  alGuardar: () => void
}) {
  const s = useServicios()
  const { token } = useUsuario()
  const notificar = useNotificar()
  const [v, setV] = useState({
    nombre: usuario?.nombreUsuario ?? "",
    correo: usuario?.correo ?? "",
    telefono: usuario ? formatearTelefono(usuario.telefono) : "",
    rol: usuario?.rol ?? "usuario" as Rol,
    activo: usuario?.activo ?? true,
  })
  const [temporal] = useState(contrasenaTemporal)
  const [tocado, setTocado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorServidor, setErrorServidor] = useState<{
    campo: string | null
    mensaje: string
  } | null>(null)

  const errores = {
    nombreUsuario:
      v.nombre.trim().length < 3
        ? "Escriba el nombre (al menos 3 letras)."
        : null,
    correo: !correoValido(v.correo) ? "Escriba un correo válido." : null,
    telefono: !celularValido(v.telefono)
      ? "Escriba un celular chileno (+56 9 XXXX XXXX)."
      : null,
  }
  const error = (c: keyof typeof errores) =>
    (tocado ? errores[c] : null) ??
    (errorServidor?.campo === c ? errorServidor.mensaje : null)

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    setTocado(true)
    if (Object.values(errores).some(Boolean)) return
    setGuardando(true)
    setErrorServidor(null)
    const datos = {
      nombreUsuario: v.nombre.trim(),
      correo: v.correo.trim(),
      telefono: normalizarTelefono(v.telefono)!,
      rol: v.rol,
    }
    try {
      if (usuario) {
        await s.usuarios.actualizar(
          token,
          usuario.id,
          esYo
            ? {
                nombreUsuario: datos.nombreUsuario,
                correo: datos.correo,
                telefono: datos.telefono,
              }
            : { ...datos, activo: v.activo },
        )
        notificar({ tono: "exito", titulo: "Cambios guardados" })
      } else {
        await s.usuarios.crear(token, {
          ...datos,
          contrasenaTemporal: temporal,
        })
        notificar({
          tono: "exito",
          titulo: `Se creó la cuenta de ${datos.nombreUsuario}`,
          detalle: "Le enviamos un correo con su contraseña temporal.",
        })
      }
      alGuardar()
    } catch (err) {
      setErrorServidor({ campo: campoError(err), mensaje: mensajeError(err) })
      setGuardando(false)
    }
  }

  return (
    <Dialogo
      abierto
      alCerrar={() => !guardando && alCerrar()}
      titulo={usuario ? `Editar a ${usuario.nombreUsuario}` : "Nuevo usuario"}
      descripcion={
        usuario
          ? undefined
          : "Le enviaremos un correo con una contraseña temporal para su primer ingreso."
      }
    >
      <form onSubmit={guardar} className="space-y-4" noValidate>
        <Campo
          etiqueta="Nombre y apellido"
          htmlFor="u-nombre"
          error={error("nombreUsuario")}
        >
          <Entrada
            id="u-nombre"
            value={v.nombre}
            onChange={(e) => setV({ ...v, nombre: e.target.value })}
            autoFocus
            invalido={!!error("nombreUsuario")}
          />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Correo" htmlFor="u-correo" error={error("correo")}>
            <Entrada
              id="u-correo"
              type="email"
              value={v.correo}
              onChange={(e) => setV({ ...v, correo: e.target.value })}
              placeholder="nombre@skinlaser.cl"
              invalido={!!error("correo")}
            />
          </Campo>
          <Campo etiqueta="Celular" htmlFor="u-tel" error={error("telefono")}>
            <Entrada
              id="u-tel"
              type="tel"
              inputMode="tel"
              value={v.telefono}
              onChange={(e) => setV({ ...v, telefono: e.target.value })}
              placeholder="+56 9 1234 5678"
              invalido={!!error("telefono")}
            />
          </Campo>
        </div>
        <Campo
          etiqueta="Rol"
          ayuda={
            esYo
              ? "No puede cambiar su propio rol."
              : v.rol === "administrador"
                ? "Puede gestionar usuarios, además de todo lo demás."
                : "Puede cargar datos y generar reportes."
          }
        >
          <Segmentado
            etiqueta="Rol"
            valor={v.rol}
            alCambiar={(rol) => !esYo && setV({ ...v, rol })}
            opciones={[
              { valor: "usuario", etiqueta: "Usuario" },
              { valor: "administrador", etiqueta: "Administrador" },
            ]}
          />
        </Campo>
        {usuario && !esYo && (
          <Interruptor
            activo={v.activo}
            alCambiar={(activo) => setV({ ...v, activo })}
            etiqueta="Cuenta activa"
            descripcion="Si la desactiva, no podrá ingresar hasta que la vuelva a activar."
          />
        )}
        {!usuario && (
          <div className="rounded-lg border border-dashed border-borde-fuerte px-3.5 py-3 text-[13px]">
            <p className="text-tenue">Contraseña temporal</p>
            <p className="font-mono text-[15px] tracking-wide">{temporal}</p>
          </div>
        )}
        {errorServidor &&
          !["nombreUsuario", "correo", "telefono"].includes(
            errorServidor.campo ?? "",
          ) && <Aviso tono="peligro">{errorServidor.mensaje}</Aviso>}
        <div className="flex justify-end gap-2 pt-1">
          <Boton onClick={alCerrar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="primario" cargando={guardando}>
            {usuario ? "Guardar cambios" : "Crear usuario"}
          </Boton>
        </div>
      </form>
    </Dialogo>
  )
}

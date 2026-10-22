import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link, useBlocker, useNavigate, useParams } from "react-router"
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronRight,
  Copy,
  FileSpreadsheet,
  FileText,
  Hash,
  Play,
  Plus,
  Table2,
  Trash2,
  Type,
} from "lucide-react"
import {
  campoError,
  mensajeError,
  useInformarError,
  useServicios,
  useUsuario,
} from "@/application"
import { CARACTERISTICAS } from "@/config/features"
import type { DatosPlantilla } from "@/contracts"
import { CAMPOS_DERIVADOS } from "@/domain/columns"
import { nuevoId } from "@/domain/filters"
import type { ColumnaCatalogo } from "@/domain/model"
import {
  archivoNuevo,
  bloqueNuevo,
  plantillaVacia,
  validarPlantilla,
  type ArchivoPlantilla,
  type Bloque,
  type DatosEditablesPlantilla,
  type FormatoArchivo,
  type Plantilla,
  type TipoBloque,
} from "@/domain/templates"
import { useCarga } from "@/shared/hooks"
import {
  AreaTexto,
  Aviso,
  Boton,
  Campo,
  Dialogo,
  EncabezadoPagina,
  EncabezadoTarjeta,
  Entrada,
  Esqueleto,
  Segmentado,
  Selector,
  Tarjeta,
  cn,
  useNotificar,
} from "@/shared/ui"
import { EditorFiltros } from "../componentes/EditorFiltros"
import {
  EditorGrafico,
  EditorMedidas,
  EditorTabla,
  EditorTexto,
  TituloBloque,
} from "./EditorBloque"

const TIPOS_BLOQUE: {
  tipo: TipoBloque
  nombre: string
  icono: typeof Table2
  ayuda: string
}[] = [
  {
    tipo: "tabla",
    nombre: "Tabla",
    icono: Table2,
    ayuda: "Filas del período con las columnas elegidas",
  },
  {
    tipo: "grafico",
    nombre: "Gráfico",
    icono: BarChart3,
    ayuda: "Barras, líneas, tortas y más",
  },
  {
    tipo: "medidas",
    nombre: "Medidas",
    icono: Hash,
    ayuda: "Suma, promedio, mediana, variación…",
  },
  {
    tipo: "texto",
    nombre: "Texto",
    icono: Type,
    ayuda: "Párrafo con datos del período",
  },
]

const aDatos = (p: Plantilla): DatosEditablesPlantilla => ({
  nombre: p.nombre,
  descripcion: p.descripcion,
  archivos: p.archivos,
  filtros: p.filtros,
  campoFecha: p.campoFecha,
  unidad: p.unidad,
})
const serializar = (d: DatosEditablesPlantilla) => JSON.stringify(d)
const mover = <T,>(lista: T[], i: number, delta: number) => {
  const j = i + delta
  if (j < 0 || j >= lista.length) return lista
  const copia = [...lista]
  ;[copia[i], copia[j]] = [copia[j], copia[i]]
  return copia
}

export default function EditorPlantilla() {
  const { id } = useParams()
  const s = useServicios()
  const { token } = useUsuario()
  const carga = useCarga(async () => {
    const [columnas, plantilla] = await Promise.all([
      s.datos.columnas(token),
      id ? s.plantillas.obtener(token, id) : Promise.resolve(null),
    ])
    return { columnas, plantilla }
  }, [s, token, id])

  if (carga.error)
    return (
      <div className="mx-auto max-w-5xl">
        <EncabezadoPagina
          titulo="Plantilla de reporte"
          migas={
            <Link to="/reportes" className="hover:text-texto">
              Reportes
            </Link>
          }
        />
        <Aviso
          tono="peligro"
          titulo="No se pudo abrir la plantilla"
          accion={
            <Boton tamano="sm" onClick={() => carga.recargar()}>
              Reintentar
            </Boton>
          }
        >
          {mensajeError(carga.error)}
        </Aviso>
      </div>
    )
  if (!carga.datos)
    return (
      <div className="mx-auto max-w-5xl space-y-4" aria-busy="true">
        <Esqueleto className="h-10 w-72" />
        <Esqueleto className="h-40" />
        <Esqueleto className="h-72" />
      </div>
    )
  // La clave reinicia el formulario al pasar de «nueva» a «editar» tras crear.
  return (
    <Formulario
      key={carga.datos.plantilla?.id ?? "nueva"}
      columnas={carga.datos.columnas}
      plantilla={carga.datos.plantilla}
    />
  )
}

function Formulario({
  columnas,
  plantilla: original,
}: {
  columnas: ColumnaCatalogo[]
  plantilla: Plantilla | null
}) {
  const s = useServicios()
  const { token } = useUsuario()
  const navegar = useNavigate()
  const notificar = useNotificar()
  const informarError = useInformarError()

  const camposFecha = columnas.filter((c) => c.tipo === "fecha")
  const [plantilla, setPlantilla] = useState(original)
  const [d, setD] = useState<DatosEditablesPlantilla>(() =>
    original
      ? aDatos(original)
      : plantillaVacia(
          camposFecha.find((c) => c.clave === "fecha_registro")?.clave ??
            camposFecha[0]?.clave,
        ),
  )
  const [guardado, setGuardado] = useState(() => serializar(d))
  const [intentado, setIntentado] = useState(!!original)
  const [errorNombre, setErrorNombre] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [quitarArchivo, setQuitarArchivo] = useState<ArchivoPlantilla | null>(
    null,
  )

  const catalogo = useMemo(() => [...columnas, ...CAMPOS_DERIVADOS], [columnas])
  const tipoDe = useMemo(() => {
    const m = new Map(catalogo.map((c) => [c.clave, c.tipo]))
    return (c: string) => m.get(c)
  }, [catalogo])
  const errores = useMemo(() => validarPlantilla(d, tipoDe), [d, tipoDe])
  const visibles: Record<string, string> = intentado
    ? { ...errores, ...(errorNombre ? { nombre: errorNombre } : {}) }
    : {}
  const cantidadErrores = Object.keys(errores).length
  const sucio = serializar(d) !== guardado

  const bloqueo = useBlocker(
    ({ currentLocation, nextLocation }) =>
      sucio && !guardando && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (!sucio) return
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", avisar)
    return () => window.removeEventListener("beforeunload", avisar)
  }, [sucio])

  const fijarArchivo = (
    aid: string,
    f: (a: ArchivoPlantilla) => ArchivoPlantilla,
  ) =>
    setD((x) => ({
      ...x,
      archivos: x.archivos.map((a) => (a.id === aid ? f(a) : a)),
    }))
  const fijarBloque = (aid: string, b: Bloque) =>
    fijarArchivo(aid, (a) => ({
      ...a,
      bloques: a.bloques.map((y) => (y.id === b.id ? b : y)),
    }))
  const agregarBloque = (aid: string, tipo: TipoBloque) => {
    const b = bloqueNuevo(
      tipo,
      columnas.find((c) => c.tipo === "monto")?.clave ??
        columnas.find((c) => c.tipo === "numero")?.clave ??
        "",
    )
    fijarArchivo(aid, (a) => ({ ...a, bloques: [...a.bloques, b] }))
    requestAnimationFrame(() =>
      document
        .getElementById(`bloque-${b.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
    )
  }
  const agregarArchivo = (formato: FormatoArchivo) => {
    const a = archivoNuevo(formato)
    setD((x) => ({ ...x, archivos: [...x.archivos, a] }))
    requestAnimationFrame(() =>
      document.getElementById(`archivo-${a.id}-nombre`)?.focus(),
    )
  }

  const irAlError = (clave: string) => {
    const [tipo, ident, campo] = clave.split(":")
    const destino =
      tipo === "bloque"
        ? `bloque-${ident}`
        : tipo === "archivo"
          ? `archivo-${ident}-${campo === "nombre" ? "nombre" : "bloques"}`
          : `campo-${clave}`
    const el = document.getElementById(destino)
    el?.scrollIntoView({ behavior: "smooth", block: "center" })
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement)
      el.focus({ preventScroll: true })
  }

  const guardar = async () => {
    setIntentado(true)
    const claves = Object.keys(errores)
    if (claves.length) {
      irAlError(claves[0])
      return
    }
    const datos: DatosPlantilla = {
      ...d,
      nombre: d.nombre.trim(),
      descripcion: d.descripcion.trim(),
      archivos: d.archivos.map((a) => ({ ...a, nombre: a.nombre.trim() })),
    }
    setGuardando(true)
    setErrorNombre(null)
    try {
      if (plantilla) {
        const { actual, anterior } = await s.plantillas.actualizar(
          token,
          plantilla.id,
          datos,
        )
        setPlantilla(actual)
        setD(aDatos(actual))
        setGuardado(serializar(aDatos(actual)))
        notificar({
          tono: "exito",
          titulo: "Cambios guardados",
          accion: {
            etiqueta: "Deshacer",
            alHacer: async () => {
              try {
                const { actual: restaurada } = await s.plantillas.actualizar(
                  token,
                  anterior.id,
                  aDatos(anterior),
                )
                setPlantilla(restaurada)
                setD(aDatos(restaurada))
                setGuardado(serializar(aDatos(restaurada)))
                notificar({
                  tono: "info",
                  titulo: "Se restauró la versión anterior",
                })
              } catch (e) {
                informarError(e, "No se pudo deshacer")
              }
            },
          },
        })
      } else {
        const nueva = await s.plantillas.crear(token, datos)
        setGuardado(serializar(d))
        notificar({
          tono: "exito",
          titulo: "Plantilla creada",
          detalle: `«${nueva.nombre}» ya está disponible.`,
          accion: {
            etiqueta: "Generar",
            alHacer: () => navegar(`/reportes/${nueva.id}/generar`),
          },
        })
        // Esperar a que se aplique «guardado» para que el bloqueo no intercepte la navegación.
        setTimeout(() =>
          navegar(`/reportes/${nueva.id}/editar`, { replace: true }),
        )
      }
    } catch (e) {
      if (campoError(e) === "nombre") {
        setErrorNombre(mensajeError(e))
        irAlError("nombre")
      } else informarError(e, "No se pudo guardar la plantilla")
    } finally {
      setGuardando(false)
    }
  }

  const totalBloques = d.archivos.reduce((n, a) => n + a.bloques.length, 0)

  return (
    <div className="mx-auto max-w-6xl">
      <EncabezadoPagina
        migas={
          <span className="flex items-center gap-1">
            <Link to="/reportes" className="hover:text-texto">
              Reportes
            </Link>
            <ChevronRight className="size-3.5" />
            <span>{plantilla ? "Editar plantilla" : "Nueva plantilla"}</span>
          </span>
        }
        titulo={
          d.nombre.trim() || (plantilla ? plantilla.nombre : "Nueva plantilla")
        }
        descripcion="Define qué archivos se generan y qué contiene cada uno. El período se elige al generar."
        acciones={
          <>
            {plantilla && (
              <Boton
                variante="secundario"
                icono={<Play className="size-4" />}
                disabled={sucio}
                title={
                  sucio ? "Guarda los cambios antes de generar" : undefined
                }
                onClick={() => navegar(`/reportes/${plantilla.id}/generar`)}
              >
                Generar
              </Boton>
            )}
            <Boton variante="primario" cargando={guardando} onClick={guardar}>
              {plantilla ? "Guardar cambios" : "Crear plantilla"}
            </Boton>
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-5">
          <Tarjeta>
            <EncabezadoTarjeta titulo="General" />
            <div className="space-y-4">
              <Campo
                etiqueta="Nombre"
                htmlFor="campo-nombre"
                error={visibles.nombre}
              >
                <Entrada
                  id="campo-nombre"
                  value={d.nombre}
                  maxLength={140}
                  onChange={(e) => (
                    setD({ ...d, nombre: e.target.value }), setErrorNombre(null)
                  )}
                  invalido={!!visibles.nombre}
                  placeholder="Ej.: Ingresos mensuales por profesional"
                />
              </Campo>
              <Campo
                etiqueta="Descripción"
                htmlFor="campo-descripcion"
                opcional
                error={visibles.descripcion}
                ayuda={`${d.descripcion.length}/500`}
              >
                <AreaTexto
                  id="campo-descripcion"
                  rows={2}
                  value={d.descripcion}
                  onChange={(e) => setD({ ...d, descripcion: e.target.value })}
                  invalido={!!visibles.descripcion}
                  placeholder="Para qué sirve y a quién va dirigido"
                />
              </Campo>
            </div>
          </Tarjeta>

          <Tarjeta>
            <EncabezadoTarjeta
              titulo="Datos"
              descripcion="Qué filas entran en el reporte. Al generar se pueden ajustar."
            />
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo
                  etiqueta="Campo de fecha del período"
                  htmlFor="campo-campoFecha"
                  error={visibles.campoFecha}
                >
                  <Selector
                    id="campo-campoFecha"
                    value={d.campoFecha}
                    onChange={(e) => setD({ ...d, campoFecha: e.target.value })}
                    invalido={!!visibles.campoFecha}
                  >
                    {!camposFecha.some((c) => c.clave === d.campoFecha) && (
                      <option value={d.campoFecha}>
                        {d.campoFecha || "Elegir…"}
                      </option>
                    )}
                    {camposFecha.map((c) => (
                      <option key={c.clave} value={c.clave}>
                        {c.etiqueta}
                      </option>
                    ))}
                  </Selector>
                </Campo>
                {(CARACTERISTICAS.consolidacionPagos ||
                  d.unidad === "citas") && (
                  <Campo
                    etiqueta="Contar por"
                    ayuda={
                      d.unidad === "citas"
                        ? "Une los pagos de una misma cita en una sola fila."
                        : "Cada fila cargada cuenta una vez."
                    }
                  >
                    <Segmentado
                      etiqueta="Unidad de análisis"
                      valor={d.unidad}
                      alCambiar={(unidad) => setD({ ...d, unidad })}
                      opciones={[
                        { valor: "filas", etiqueta: "Filas" },
                        { valor: "citas", etiqueta: "Citas" },
                      ]}
                    />
                  </Campo>
                )}
              </div>
              <div>
                <p className="mb-2 text-[13px] font-medium">
                  Filtros por defecto
                </p>
                <EditorFiltros
                  grupo={d.filtros}
                  alCambiar={(filtros) => setD({ ...d, filtros })}
                  columnas={columnas}
                />
              </div>
            </div>
          </Tarjeta>

          <section aria-labelledby="titulo-archivos" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="titulo-archivos" className="text-[15px] font-semibold">
                  Archivos de salida
                </h2>
                <p className="text-[13px] text-suave">
                  Cada archivo se genera por separado. Puedes combinar Excel y
                  PDF.
                </p>
              </div>
              <div className="flex gap-2">
                <Boton
                  tamano="sm"
                  icono={<FileSpreadsheet className="size-3.5" />}
                  onClick={() => agregarArchivo("excel")}
                >
                  Agregar Excel
                </Boton>
                <Boton
                  tamano="sm"
                  icono={<FileText className="size-3.5" />}
                  onClick={() => agregarArchivo("pdf")}
                >
                  Agregar PDF
                </Boton>
              </div>
            </div>
            {visibles.archivos && (
              <Aviso tono="peligro">{visibles.archivos}</Aviso>
            )}

            {d.archivos.map((a, ia) => (
              <TarjetaArchivo
                key={a.id}
                a={a}
                errores={visibles}
                columnas={catalogo}
                primero={ia === 0}
                ultimo={ia === d.archivos.length - 1}
                alCambiar={(f) => fijarArchivo(a.id, f)}
                alFijarBloque={(b) => fijarBloque(a.id, b)}
                alAgregarBloque={(t) => agregarBloque(a.id, t)}
                alMover={(delta) =>
                  setD((x) => ({
                    ...x,
                    archivos: mover(x.archivos, ia, delta),
                  }))
                }
                alQuitar={() =>
                  a.bloques.length
                    ? setQuitarArchivo(a)
                    : setD((x) => ({
                        ...x,
                        archivos: x.archivos.filter((y) => y.id !== a.id),
                      }))
                }
              />
            ))}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <Tarjeta>
            <p className="mb-3 text-[13px] font-semibold">Resumen</p>
            <ul className="space-y-1.5">
              {d.archivos.map((a) => {
                const Icono = a.formato === "excel" ? FileSpreadsheet : FileText
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() =>
                        document
                          .getElementById(`archivo-${a.id}`)
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          })
                      }
                      className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[13px] hover:bg-superficie-2"
                    >
                      <Icono
                        className={cn(
                          "size-4 shrink-0",
                          a.formato === "excel" ? "text-exito" : "text-peligro",
                        )}
                      />
                      <span className="truncate">
                        {a.nombre.trim() || "Sin nombre"}
                      </span>
                      <span className="num ml-auto text-[12px] text-tenue">
                        {a.bloques.length}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 border-t border-borde pt-3 text-[12.5px] text-tenue">
              {d.archivos.length}{" "}
              {d.archivos.length === 1 ? "archivo" : "archivos"} ·{" "}
              {totalBloques} {totalBloques === 1 ? "contenido" : "contenidos"}
            </p>
          </Tarjeta>

          {intentado && cantidadErrores > 0 && (
            <Tarjeta className="border-peligro/30">
              <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-peligro">
                <AlertCircle className="size-4" />
                {cantidadErrores === 1
                  ? "1 punto por revisar"
                  : `${cantidadErrores} puntos por revisar`}
              </p>
              <ul className="space-y-1">
                {Object.entries(errores)
                  .slice(0, 6)
                  .map(([k, m]) => (
                    <li key={k}>
                      <button
                        type="button"
                        onClick={() => irAlError(k)}
                        className="text-left text-[12.5px] text-suave hover:text-texto hover:underline"
                      >
                        {m}
                      </button>
                    </li>
                  ))}
              </ul>
            </Tarjeta>
          )}
          {sucio && (
            <p className="px-1 text-[12.5px] text-tenue">
              Hay cambios sin guardar.
            </p>
          )}
        </aside>
      </div>

      <Dialogo
        abierto={!!quitarArchivo}
        alCerrar={() => setQuitarArchivo(null)}
        ancho="sm"
        titulo="¿Quitar este archivo?"
        descripcion={
          quitarArchivo &&
          `«${quitarArchivo.nombre.trim() || "Sin nombre"}» tiene ${quitarArchivo.bloques.length} ${
            quitarArchivo.bloques.length === 1 ? "contenido" : "contenidos"
          }. El cambio se aplica al guardar.`
        }
        pie={
          <>
            <Boton onClick={() => setQuitarArchivo(null)}>Cancelar</Boton>
            <Boton
              variante="peligro"
              onClick={() => (
                setD((x) => ({
                  ...x,
                  archivos: x.archivos.filter(
                    (y) => y.id !== quitarArchivo?.id,
                  ),
                })),
                setQuitarArchivo(null)
              )}
            >
              Quitar archivo
            </Boton>
          </>
        }
      />

      <Dialogo
        abierto={bloqueo.state === "blocked"}
        alCerrar={() => bloqueo.reset?.()}
        ancho="sm"
        titulo="¿Salir sin guardar?"
        descripcion="Los cambios de esta plantilla se perderán."
        pie={
          <>
            <Boton onClick={() => bloqueo.reset?.()}>Seguir editando</Boton>
            <Boton variante="peligro" onClick={() => bloqueo.proceed?.()}>
              Salir sin guardar
            </Boton>
          </>
        }
      />
    </div>
  )
}

function TarjetaArchivo({
  a,
  errores,
  columnas,
  primero,
  ultimo,
  alCambiar,
  alFijarBloque,
  alAgregarBloque,
  alMover,
  alQuitar,
}: {
  a: ArchivoPlantilla
  errores: Record<string, string>
  columnas: ColumnaCatalogo[]
  primero: boolean
  ultimo: boolean
  alCambiar: (f: (a: ArchivoPlantilla) => ArchivoPlantilla) => void
  alFijarBloque: (b: Bloque) => void
  alAgregarBloque: (t: TipoBloque) => void
  alMover: (delta: number) => void
  alQuitar: () => void
}) {
  const Icono = a.formato === "excel" ? FileSpreadsheet : FileText
  const errNombre = errores[`archivo:${a.id}:nombre`]
  const errBloques = errores[`archivo:${a.id}:bloques`]
  return (
    <Tarjeta
      id={`archivo-${a.id}`}
      relleno={false}
      className="scroll-mt-6 overflow-hidden"
    >
      <div className="flex flex-wrap items-start gap-3 border-b border-borde bg-superficie-2/50 px-5 py-4">
        <span
          className={cn(
            "mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg",
            a.formato === "excel"
              ? "bg-exito-tenue text-exito"
              : "bg-peligro-tenue text-peligro",
          )}
        >
          <Icono className="size-4.5" />
        </span>
        <Campo className="min-w-48 flex-1" error={errNombre}>
          <Entrada
            id={`archivo-${a.id}-nombre`}
            value={a.nombre}
            onChange={(e) =>
              alCambiar((x) => ({ ...x, nombre: e.target.value }))
            }
            placeholder="Nombre del archivo"
            aria-label="Nombre del archivo"
            invalido={!!errNombre}
            sufijo={
              <span className="pr-2 text-[12px] text-tenue">
                .{a.formato === "excel" ? "xlsx" : "pdf"}
              </span>
            }
          />
        </Campo>
        <Segmentado<FormatoArchivo>
          etiqueta="Formato"
          valor={a.formato}
          alCambiar={(formato) => alCambiar((x) => ({ ...x, formato }))}
          opciones={[
            { valor: "excel", etiqueta: "Excel" },
            { valor: "pdf", etiqueta: "PDF" },
          ]}
        />
        <Acciones>
          <Boton
            variante="fantasma"
            soloIcono
            aria-label="Subir archivo"
            disabled={primero}
            icono={<ArrowUp className="size-4" />}
            onClick={() => alMover(-1)}
          />
          <Boton
            variante="fantasma"
            soloIcono
            aria-label="Bajar archivo"
            disabled={ultimo}
            icono={<ArrowDown className="size-4" />}
            onClick={() => alMover(1)}
          />
          <Boton
            variante="fantasma"
            soloIcono
            aria-label="Quitar archivo"
            icono={<Trash2 className="size-4" />}
            onClick={alQuitar}
          />
        </Acciones>
      </div>

      <div className="space-y-3 p-5">
        {a.bloques.map((b, ib) => {
          const tipo = TIPOS_BLOQUE.find((t) => t.tipo === b.tipo)!
          const error = (campo: string) => errores[`bloque:${b.id}:${campo}`]
          const conError = Object.keys(errores).some((k) =>
            k.startsWith(`bloque:${b.id}:`),
          )
          const fijar = (n: Bloque) => alFijarBloque(n)
          return (
            <div
              key={b.id}
              id={`bloque-${b.id}`}
              className={cn(
                "scroll-mt-6 rounded-xl border p-4",
                conError ? "border-peligro/40" : "border-borde",
              )}
            >
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-md bg-superficie-2 px-2 py-1 text-[12px] font-medium text-suave">
                  <tipo.icono className="size-3.5" />
                  {tipo.nombre}
                </span>
                <div className="min-w-40 flex-1">
                  <TituloBloque
                    b={b}
                    alCambiar={(titulo) => fijar({ ...b, titulo })}
                  />
                </div>
                <Acciones>
                  <Boton
                    tamano="sm"
                    variante="fantasma"
                    soloIcono
                    aria-label="Subir"
                    disabled={ib === 0}
                    icono={<ArrowUp className="size-3.5" />}
                    onClick={() =>
                      alCambiar((x) => ({
                        ...x,
                        bloques: mover(x.bloques, ib, -1),
                      }))
                    }
                  />
                  <Boton
                    tamano="sm"
                    variante="fantasma"
                    soloIcono
                    aria-label="Bajar"
                    disabled={ib === a.bloques.length - 1}
                    icono={<ArrowDown className="size-3.5" />}
                    onClick={() =>
                      alCambiar((x) => ({
                        ...x,
                        bloques: mover(x.bloques, ib, 1),
                      }))
                    }
                  />
                  <Boton
                    tamano="sm"
                    variante="fantasma"
                    soloIcono
                    aria-label="Duplicar"
                    icono={<Copy className="size-3.5" />}
                    onClick={() =>
                      alCambiar((x) => ({
                        ...x,
                        bloques: [
                          ...x.bloques.slice(0, ib + 1),
                          {
                            ...b,
                            id: nuevoId("b"),
                            titulo: b.titulo ? `${b.titulo} (copia)` : "",
                          },
                          ...x.bloques.slice(ib + 1),
                        ],
                      }))
                    }
                  />
                  <Boton
                    tamano="sm"
                    variante="fantasma"
                    soloIcono
                    aria-label="Quitar"
                    icono={<Trash2 className="size-3.5" />}
                    onClick={() =>
                      alCambiar((x) => ({
                        ...x,
                        bloques: x.bloques.filter((y) => y.id !== b.id),
                      }))
                    }
                  />
                </Acciones>
              </div>
              {b.tipo === "tabla" && (
                <EditorTabla
                  b={b}
                  alCambiar={fijar}
                  columnas={columnas}
                  error={error}
                />
              )}
              {b.tipo === "grafico" && (
                <EditorGrafico
                  b={b}
                  alCambiar={fijar}
                  columnas={columnas}
                  error={error}
                />
              )}
              {b.tipo === "medidas" && (
                <EditorMedidas
                  b={b}
                  alCambiar={fijar}
                  columnas={columnas}
                  error={error}
                />
              )}
              {b.tipo === "texto" && (
                <EditorTexto
                  b={b}
                  alCambiar={fijar}
                  columnas={columnas}
                  error={error}
                />
              )}
            </div>
          )
        })}

        <div
          id={`archivo-${a.id}-bloques`}
          className={cn(
            "scroll-mt-6 rounded-xl border border-dashed p-3",
            errBloques ? "border-peligro/50" : "border-borde",
          )}
        >
          <p
            className={cn(
              "mb-2 text-[12.5px]",
              errBloques ? "text-peligro" : "text-tenue",
            )}
          >
            {errBloques ??
              (a.bloques.length
                ? "Agregar otro contenido"
                : "Este archivo aún no tiene contenido")}
          </p>
          <div className="grid gap-2 sm:grid-cols-4">
            {TIPOS_BLOQUE.map((t) => (
              <button
                key={t.tipo}
                type="button"
                onClick={() => alAgregarBloque(t.tipo)}
                className="group flex items-start gap-2.5 rounded-lg border border-borde bg-superficie px-3 py-2.5 text-left transition-colors hover:border-acento/50 hover:bg-acento-tenue/40"
              >
                <t.icono className="mt-0.5 size-4 shrink-0 text-tenue group-hover:text-acento" />
                <span>
                  <span className="flex items-center gap-1 text-[13px] font-medium">
                    <Plus className="size-3" />
                    {t.nombre}
                  </span>
                  <span className="block text-[12px] leading-snug text-tenue">
                    {t.ayuda}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Tarjeta>
  )
}

const Acciones = ({ children }: { children: ReactNode }) => (
  <div className="ml-auto flex items-center gap-0.5">{children}</div>
)

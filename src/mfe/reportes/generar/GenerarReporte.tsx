import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router"
import {
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Loader2,
  Pencil,
  Play,
  RotateCcw,
} from "lucide-react"
import {
  mensajeError,
  useInformarError,
  useServicios,
  useUsuario,
} from "@/application"
import { CARACTERISTICAS } from "@/config/features"
import type { ArchivoGenerado, EstadoDatos } from "@/contracts"
import { CAMPOS_DERIVADOS } from "@/domain/columns"
import { describirFiltro, type Grupo } from "@/domain/filters"
import type { ColumnaCatalogo } from "@/domain/model"
import {
  bloqueVacio,
  rangoAnio,
  rangoUsaHorario,
  rangoValido,
  type RangoFechas,
} from "@/domain/ranges"
import type { Plantilla } from "@/domain/templates"
import { guardarArchivos } from "@/infrastructure/descargas"
import { useCarga, useRetardo } from "@/shared/hooks"
import {
  Aviso,
  Boton,
  Campo,
  EncabezadoPagina,
  EncabezadoTarjeta,
  Esqueleto,
  Selector,
  Tarjeta,
  cn,
  useNotificar,
} from "@/shared/ui"
import { EditorFiltros } from "../componentes/EditorFiltros"
import { SelectorPeriodo } from "../componentes/SelectorPeriodo"

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const entreFechas = (desde: Date, hasta: Date): RangoFechas => ({
  bloques: [
    { ...bloqueVacio("incluir"), desde: iso(desde), hasta: iso(hasta) },
  ],
})

function atajos(): { id: string; etiqueta: string; rango: () => RangoFechas }[] {
  const hoy = new Date()
  const a = hoy.getFullYear(),
    m = hoy.getMonth()
  return [
    {
      id: "mes",
      etiqueta: "Este mes",
      rango: () => entreFechas(new Date(a, m, 1), new Date(a, m + 1, 0)),
    },
    {
      id: "mes_anterior",
      etiqueta: "Mes anterior",
      rango: () => entreFechas(new Date(a, m - 1, 1), new Date(a, m, 0)),
    },
    {
      id: "trimestre",
      etiqueta: "Este trimestre",
      rango: () =>
        entreFechas(
          new Date(a, Math.floor(m / 3) * 3, 1),
          new Date(a, Math.floor(m / 3) * 3 + 3, 0),
        ),
    },
    {
      id: "12_meses",
      etiqueta: "Últimos 12 meses",
      rango: () => entreFechas(new Date(a, m - 11, 1), new Date(a, m + 1, 0)),
    },
    { id: "anio", etiqueta: "Este año", rango: () => rangoAnio(a) },
    {
      id: "anio_anterior",
      etiqueta: "Año anterior",
      rango: () => rangoAnio(a - 1),
    },
  ]
}

interface Lote {
  id: number
  creadoEn: Date
  archivos: ArchivoGenerado[]
  destino: string
}

export default function GenerarReporte() {
  const { id = "" } = useParams()
  const s = useServicios()
  const { token } = useUsuario()
  const carga = useCarga(async () => {
    const [plantilla, columnas, estado] = await Promise.all([
      s.plantillas.obtener(token, id),
      s.datos.columnas(token),
      s.datos.estado(token),
    ])
    return { plantilla, columnas, estado }
  }, [s, token, id])

  const migas = (nombre?: string) => (
    <span className="flex items-center gap-1">
      <Link to="/reportes" className="hover:text-texto">
        Reportes
      </Link>
      {nombre && (
        <>
          <ChevronRight className="size-3.5" />
          <span className="truncate">{nombre}</span>
        </>
      )}
    </span>
  )

  if (carga.error)
    return (
      <div className="mx-auto max-w-5xl">
        <EncabezadoPagina titulo="Generar reporte" migas={migas()} />
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
      <div className="mx-auto max-w-6xl space-y-4" aria-busy="true">
        <Esqueleto className="h-10 w-80" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Esqueleto className="h-96" />
          <Esqueleto className="h-64" />
        </div>
      </div>
    )
  return (
    <Generador {...carga.datos} migas={migas(carga.datos.plantilla.nombre)} />
  )
}

function Generador({
  plantilla,
  columnas,
  estado,
  migas,
}: {
  plantilla: Plantilla
  columnas: ColumnaCatalogo[]
  estado: EstadoDatos
  migas: ReactNode
}) {
  const s = useServicios()
  const { token, usuario } = useUsuario()
  const notificar = useNotificar()
  const informarError = useInformarError()
  const navegar = useNavigate()

  const anios = useMemo(
    () => [...estado.aniosDisponibles].sort((a, b) => a - b),
    [estado.aniosDisponibles],
  )
  const [rango, setRango] = useState<RangoFechas>(() =>
    rangoAnio(anios.at(-1) ?? new Date().getFullYear()),
  )
  const [atajo, setAtajo] = useState<string | null>(() => {
    const ultimo = anios.at(-1) ?? new Date().getFullYear()
    const actual = new Date().getFullYear()
    return ultimo === actual
      ? "anio"
      : ultimo === actual - 1
        ? "anio_anterior"
        : null
  })
  const [filtros, setFiltros] = useState<Grupo>(plantilla.filtros)
  const [campoFecha, setCampoFecha] = useState(plantilla.campoFecha)
  const [conteo, setConteo] = useState<{
    total: number
    sinHora: number
  } | null>(null)
  const [contando, setContando] = useState(false)
  const [errorConteo, setErrorConteo] = useState<string | null>(null)
  const [pasos, setPasos] = useState<string[] | null>(null)
  const [lotes, setLotes] = useState<Lote[]>([])

  const camposFecha = columnas.filter((c) => c.tipo === "fecha")
  const etiqueta = (c: string) =>
    [...columnas, ...CAMPOS_DERIVADOS].find((x) => x.clave === c)?.etiqueta ?? c
  const valido = rangoValido(rango)
  const filtrosCambiados =
    JSON.stringify(filtros) !== JSON.stringify(plantilla.filtros)
  const usaHeatmap = plantilla.archivos.some((a) =>
    a.bloques.some((b) => b.tipo === "grafico" && b.grafico === "heatmap"),
  )
  const generando = pasos !== null
  const usarCarpeta =
    CARACTERISTICAS.carpetaDescarga && !!usuario.preferencias.carpetaDescarga
  const archivos = plantilla.archivos.filter(
    (a) => CARACTERISTICAS.exportacion[a.formato],
  )

  const consulta = useMemo(
    () => ({ campoFecha, rango, filtros, unidad: plantilla.unidad }),
    [campoFecha, rango, filtros, plantilla.unidad],
  )
  const consultaRetardada = useRetardo(consulta, 400)
  useEffect(() => {
    if (!rangoValido(consultaRetardada.rango)) {
      setConteo(null)
      return
    }
    let vigente = true
    setContando(true)
    setErrorConteo(null)
    s.datos.contar(token, consultaRetardada).then(
      (c) => vigente && (setConteo(c), setContando(false)),
      (e) => vigente && (setErrorConteo(mensajeError(e)), setContando(false)),
    )
    return () => {
      vigente = false
    }
  }, [s, token, consultaRetardada])
  const pendiente = contando || consulta !== consultaRetardada

  const generar = async () => {
    setPasos([])
    try {
      const generados = await s.reportes.generar(
        token,
        { plantillaId: plantilla.id, rango, filtros, campoFecha },
        (paso) => setPasos((p) => [...(p ?? []), paso]),
      )
      setPasos((p) => [...(p ?? []), "Guardando los archivos"])
      const r = await guardarArchivos(generados, usarCarpeta)
      const destino =
        r.destino === "carpeta"
          ? `Carpeta «${r.carpeta}»`
          : "Descargas del navegador"
      setLotes((l) => [
        { id: Date.now(), creadoEn: new Date(), archivos: generados, destino },
        ...l,
      ])
      notificar({
        tono: "exito",
        titulo:
          generados.length === 1
            ? "Reporte generado"
            : `${generados.length} archivos generados`,
        detalle:
          r.destino === "carpeta"
            ? `Se guardaron en la carpeta «${r.carpeta}».`
            : usarCarpeta
              ? "No se pudo usar tu carpeta; se descargaron con el navegador."
              : "Se descargaron con el navegador.",
      })
    } catch (e) {
      informarError(e, "No se pudo generar el reporte")
    } finally {
      setPasos(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <EncabezadoPagina
        migas={migas}
        titulo={plantilla.nombre}
        descripcion={
          plantilla.descripcion ||
          "Elige el período y genera los archivos de esta plantilla."
        }
        acciones={
          <Boton
            variante="secundario"
            icono={<Pencil className="size-4" />}
            onClick={() => navegar(`/reportes/${plantilla.id}/editar`)}
          >
            Editar plantilla
          </Boton>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Tarjeta>
            <EncabezadoTarjeta
              titulo="Período"
              descripcion="Combina años, meses, rangos o días; agrega exclusiones para quitar fechas puntuales."
            />
            <div
              className="mb-4 flex flex-wrap gap-1.5"
              role="group"
              aria-label="Atajos de período"
            >
              {atajos().map((x) => (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={atajo === x.id}
                  onClick={() => (setRango(x.rango()), setAtajo(x.id))}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[13px] transition-colors",
                    atajo === x.id
                      ? "border-acento bg-acento text-sobre-acento"
                      : "border-borde text-suave hover:border-borde-fuerte hover:text-texto",
                  )}
                >
                  {x.etiqueta}
                </button>
              ))}
            </div>
            <SelectorPeriodo
              valor={rango}
              alCambiar={(r) => (setRango(r), setAtajo(null))}
              anios={anios}
            />
          </Tarjeta>

          <Tarjeta>
            <EncabezadoTarjeta
              titulo="Filtros"
              descripcion="Vienen de la plantilla; los cambios aplican solo a esta generación."
              accion={
                filtrosCambiados && (
                  <Boton
                    tamano="sm"
                    variante="fantasma"
                    icono={<RotateCcw className="size-3.5" />}
                    onClick={() => setFiltros(plantilla.filtros)}
                  >
                    Restablecer
                  </Boton>
                )
              }
            />
            <div className="space-y-5">
              {camposFecha.length > 1 && (
                <Campo
                  etiqueta="El período se aplica sobre"
                  htmlFor="campo-fecha"
                  className="sm:max-w-xs"
                >
                  <Selector
                    id="campo-fecha"
                    value={campoFecha}
                    onChange={(e) => setCampoFecha(e.target.value)}
                  >
                    {camposFecha.map((c) => (
                      <option key={c.clave} value={c.clave}>
                        {c.etiqueta}
                      </option>
                    ))}
                  </Selector>
                </Campo>
              )}
              <EditorFiltros
                grupo={filtros}
                alCambiar={setFiltros}
                columnas={columnas}
              />
            </div>
          </Tarjeta>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <Tarjeta>
            <p className="text-[13px] text-suave">
              {plantilla.unidad === "citas" ? "Citas" : "Filas"} que entran en
              el reporte
            </p>
            <p
              className={cn(
                "num mt-1 text-[32px] leading-tight font-semibold tracking-tight transition-opacity",
                pendiente && "opacity-50",
              )}
              aria-live="polite"
            >
              {!valido || (errorConteo && !conteo) ? (
                "—"
              ) : conteo ? (
                conteo.total.toLocaleString("es-CL")
              ) : (
                <Loader2 className="mt-2 size-6 animate-spin text-tenue" />
              )}
            </p>
            {!valido && (
              <p className="mt-1 text-[12.5px] text-aviso">
                Elige al menos un año, mes o fecha.
              </p>
            )}
            {valido && conteo?.total === 0 && !pendiente && (
              <p className="mt-1 text-[12.5px] text-aviso">
                No hay datos para este período y filtros.
              </p>
            )}
            {errorConteo && (
              <p className="mt-1 text-[12.5px] text-peligro">{errorConteo}</p>
            )}
            {valido &&
              !!conteo?.sinHora &&
              (rangoUsaHorario(rango) || usaHeatmap) && (
                <p className="mt-1 text-[12.5px] text-tenue">
                  {conteo.sinHora.toLocaleString("es-CL")} sin hora registrada;{" "}
                  {rangoUsaHorario(rango)
                    ? "no entran en el horario elegido"
                    : "no aparecen en el mapa de calor"}
                  .
                </p>
              )}
            {filtros.hijos.length > 0 && (
              <p className="mt-3 border-t border-borde pt-3 text-[12.5px] text-tenue">
                {describirFiltro(filtros, etiqueta)}
              </p>
            )}

            <ul className="mt-4 space-y-1.5 border-t border-borde pt-4">
              {archivos.map((a) => {
                const Icono = a.formato === "excel" ? FileSpreadsheet : FileText
                return (
                  <li
                    key={a.id}
                    className="flex items-center gap-2 text-[13px]"
                  >
                    <Icono
                      className={cn(
                        "size-4 shrink-0",
                        a.formato === "excel" ? "text-exito" : "text-peligro",
                      )}
                    />
                    <span className="truncate">{a.nombre}</span>
                    <span className="ml-auto text-[12px] text-tenue">
                      {a.formato === "excel" ? "xlsx" : "pdf"}
                    </span>
                  </li>
                )
              })}
            </ul>

            <Boton
              variante="primario"
              className="mt-4 w-full"
              icono={<Play className="size-4" />}
              cargando={generando}
              disabled={
                !valido || !archivos.length || conteo?.total === 0 || pendiente
              }
              onClick={generar}
            >
              {generando
                ? "Generando…"
                : archivos.length > 1
                  ? `Generar ${archivos.length} archivos`
                  : "Generar"}
            </Boton>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-tenue">
              <FolderOpen className="size-3.5" />
              {usarCarpeta ? (
                `Se guardarán en «${usuario.preferencias.carpetaDescarga}»`
              ) : (
                <span>
                  Se descargarán con el navegador.{" "}
                  {CARACTERISTICAS.carpetaDescarga && (
                    <Link to="/perfil" className="text-acento hover:underline">
                      Elegir carpeta
                    </Link>
                  )}
                </span>
              )}
            </p>

            {generando && (
              <ol
                className="animar-aparecer mt-4 space-y-1.5 border-t border-borde pt-4"
                aria-live="polite"
              >
                {pasos.map((p, i) => {
                  const actual = i === pasos.length - 1
                  return (
                    <li
                      key={i}
                      className={cn(
                        "flex items-start gap-2 text-[12.5px]",
                        actual ? "text-texto" : "text-tenue",
                      )}
                    >
                      {actual ? (
                        <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-acento" />
                      ) : (
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-exito" />
                      )}
                      {p}
                    </li>
                  )
                })}
              </ol>
            )}
          </Tarjeta>

          {lotes.length > 0 && (
            <Tarjeta>
              <p className="mb-3 text-[13px] font-semibold">
                Generados en esta sesión
              </p>
              <div className="space-y-4">
                {lotes.map((l) => (
                  <div key={l.id}>
                    <p className="mb-1.5 text-[12px] text-tenue">
                      {l.creadoEn.toLocaleTimeString("es-CL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {l.destino}
                    </p>
                    <ul className="space-y-1">
                      {l.archivos.map((f) => (
                        <li
                          key={f.nombre}
                          className="flex items-center gap-2 text-[13px]"
                        >
                          {f.formato === "excel" ? (
                            <FileSpreadsheet className="size-4 shrink-0 text-exito" />
                          ) : (
                            <FileText className="size-4 shrink-0 text-peligro" />
                          )}
                          <span
                            className="min-w-0 flex-1 truncate"
                            title={f.nombre}
                          >
                            {f.nombre}
                          </span>
                          <Boton
                            tamano="sm"
                            variante="fantasma"
                            soloIcono
                            aria-label={`Descargar ${f.nombre}`}
                            icono={<Download className="size-3.5" />}
                            onClick={() => guardarArchivos([f], false)}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Tarjeta>
          )}
        </aside>
      </div>
    </div>
  )
}

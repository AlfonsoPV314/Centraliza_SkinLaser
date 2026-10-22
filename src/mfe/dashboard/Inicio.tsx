import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import type { EChartsOption } from "echarts"
import {
  ArrowRight,
  CopyX,
  FileChartColumn,
  FileWarning,
  History,
  Undo2,
  Upload,
  UserRoundPen,
  Users,
  Rows3,
} from "lucide-react"
import {
  avisarCambioDatos,
  useCambiosDatos,
  useInformarError,
  useServicios,
  useUsuario,
} from "@/application"
import type { EstadoDatos, Importacion } from "@/contracts"
import { CAMPOS_BASE, CAMPOS_CONOCIDOS } from "@/domain/columns"
import { MESES_CORTOS } from "@/domain/dates"
import { formatearNumero, plural } from "@/domain/format"
import type { Plantilla } from "@/domain/templates"
import {
  fechaLarga,
  resumenConteos,
  saludo,
  tiempoRelativo,
} from "@/shared/presentacion"
import {
  Boton,
  Dialogo,
  EncabezadoTarjeta,
  Esqueleto,
  Grafico,
  Insignia,
  Tarjeta,
  Vacio,
  cn,
  useColoresTema,
  useNotificar,
} from "@/shared/ui"

type Resumen = { total: number; masUsadas: Plantilla[]; recientes: Plantilla[] }
const entero = (n: number) => formatearNumero(n, 0)

export default function Inicio() {
  const s = useServicios()
  const { usuario, token } = useUsuario()
  const informar = useInformarError()
  const notificar = useNotificar()
  const [estado, setEstado] = useState<EstadoDatos | null>(null)
  const [cargas, setCargas] = useState<Importacion[] | null>(null)
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [deshacer, setDeshacer] = useState<Importacion | null>(null)
  const [deshaciendo, setDeshaciendo] = useState(false)

  const cargar = useCallback(() => {
    Promise.all([
      s.datos.estado(token),
      s.ingesta.listar(token, 6),
      s.plantillas.resumen(token),
    ])
      .then(([e, c, r]) => (setEstado(e), setCargas(c), setResumen(r)))
      .catch((e) => informar(e, "No pudimos cargar el resumen"))
  }, [s, token, informar])
  useEffect(cargar, [cargar])
  useCambiosDatos(cargar)

  const confirmarDeshacer = async () => {
    if (!deshacer) return
    setDeshaciendo(true)
    try {
      await s.ingesta.deshacer(token, deshacer.id)
      notificar({
        tono: "exito",
        titulo: "Carga deshecha",
        detalle: "Los datos volvieron a como estaban antes de esa carga.",
      })
      setDeshacer(null)
      avisarCambioDatos()
    } catch (e) {
      informar(e, "No se pudo deshacer la carga")
    } finally {
      setDeshaciendo(false)
    }
  }

  const nombre = usuario.nombreUsuario.split(" ")[0]
  const pendientes = estado
    ? estado.filasConError +
      estado.duplicadosPendientes +
      estado.pacientesIncompletos
    : 0

  return (
    <div className="animar-aparecer">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] text-tenue capitalize">{fechaLarga()}</p>
          <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">
            {saludo()}, {nombre}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link to="/reportes">
            <Boton icono={<FileChartColumn className="size-4" />}>
              Generar reporte
            </Boton>
          </Link>
          <Link to="/cargar">
            <Boton variante="primario" icono={<Upload className="size-4" />}>
              Cargar planillas
            </Boton>
          </Link>
        </div>
      </header>

      {estado && estado.filas === 0 ? (
        <Tarjeta className="overflow-hidden" relleno={false}>
          <Vacio
            icono={<Upload className="size-5" />}
            titulo="Todavía no hay datos guardados"
            accion={
              <Link to="/cargar">
                <Boton variante="primario" tamano="lg">
                  Cargar mi primera planilla
                </Boton>
              </Link>
            }
            className="py-16"
          >
            Suba las planillas de Excel exportadas desde PhilaxMed u otros
            sistemas. Reconoceremos las columnas, uniremos los pacientes y le
            avisaremos de cualquier problema antes de guardar.
          </Vacio>
        </Tarjeta>
      ) : (
        <>
          <section
            aria-label="Resumen"
            className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            <Indicador
              icono={<Rows3 className="size-4" />}
              etiqueta="Filas guardadas"
              valor={estado && entero(estado.filas)}
            />
            <Indicador
              icono={<Users className="size-4" />}
              etiqueta="Pacientes"
              valor={estado && entero(estado.pacientes)}
            />
            <Indicador
              icono={<History className="size-4" />}
              etiqueta="Última carga"
              valor={
                estado &&
                (estado.ultimaCarga
                  ? tiempoRelativo(estado.ultimaCarga)
                  : "Sin cargas")
              }
              pequeno
            />
            <Indicador
              icono={<FileWarning className="size-4" />}
              etiqueta="Por revisar"
              valor={estado && entero(pendientes)}
              tono={pendientes ? "aviso" : "exito"}
              enlace={pendientes ? "/datos" : undefined}
            />
          </section>

          {estado && pendientes > 0 && <Pendientes estado={estado} />}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <Tarjeta>
                <EncabezadoTarjeta
                  titulo="Filas por mes"
                  descripcion="Según la fecha de cada registro, últimos 15 meses con datos."
                />
                {estado ? (
                  <GraficoMeses datos={estado.filasPorMes} />
                ) : (
                  <Esqueleto className="h-[260px]" />
                )}
              </Tarjeta>
              <Tarjeta>
                <EncabezadoTarjeta
                  titulo="Últimas cargas"
                  icono={<History className="size-4" />}
                  accion={
                    <Link
                      to="/datos?pestana=historial"
                      className="text-[13px] text-acento hover:underline"
                    >
                      Ver historial
                    </Link>
                  }
                />
                {!cargas ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <Esqueleto key={i} className="h-12" />
                    ))}
                  </div>
                ) : cargas.length === 0 ? (
                  <p className="py-6 text-center text-[13.5px] text-suave">
                    Aún no hay cargas.
                  </p>
                ) : (
                  <ul className="-mx-2 divide-y divide-borde">
                    {cargas.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center gap-3 px-2 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium">
                            {c.archivos.map((a) => a.nombre).join(", ")}
                          </p>
                          <p className="truncate text-[12.5px] text-tenue">
                            {tiempoRelativo(c.creadaEn)} · {c.usuario} ·{" "}
                            {resumenConteos(c.conteos)}
                          </p>
                        </div>
                        {c.estado === "deshecha" ? (
                          <Insignia>Deshecha</Insignia>
                        ) : c.sePuedeDeshacer ? (
                          <Boton
                            tamano="sm"
                            variante="fantasma"
                            icono={<Undo2 className="size-3.5" />}
                            onClick={() => setDeshacer(c)}
                          >
                            Deshacer
                          </Boton>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Tarjeta>
            </div>

            <div className="space-y-6">
              <Tarjeta>
                <EncabezadoTarjeta
                  titulo="Reportes frecuentes"
                  icono={<FileChartColumn className="size-4" />}
                  accion={
                    <Link
                      to="/reportes"
                      className="text-[13px] text-acento hover:underline"
                    >
                      Todas
                    </Link>
                  }
                />
                {!resumen ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <Esqueleto key={i} className="h-11" />
                    ))}
                  </div>
                ) : resumen.total === 0 ? (
                  <div className="py-4 text-center">
                    <p className="mb-3 text-[13.5px] text-suave">
                      Cree una plantilla para generar reportes con un clic.
                    </p>
                    <Link to="/reportes/nueva">
                      <Boton tamano="sm">Nueva plantilla</Boton>
                    </Link>
                  </div>
                ) : (
                  <ul className="-mx-1 space-y-0.5">
                    {(resumen.masUsadas.length
                      ? resumen.masUsadas
                      : resumen.recientes
                    )
                      .slice(0, 4)
                      .map((p) => (
                        <li key={p.id}>
                          <Link
                            to={`/reportes/${p.id}/generar`}
                            className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-superficie-2"
                          >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-acento-tenue text-acento">
                              <FileChartColumn className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13.5px] font-medium">
                                {p.nombre}
                              </span>
                              <span className="block text-[12px] text-tenue">
                                {p.uso.veces
                                  ? `Usada ${plural(p.uso.veces, "vez", "veces")}`
                                  : "Sin usar"}
                              </span>
                            </span>
                            <ArrowRight className="size-4 text-tenue opacity-0 transition-opacity group-hover:opacity-100" />
                          </Link>
                        </li>
                      ))}
                  </ul>
                )}
              </Tarjeta>
              <Tarjeta>
                <EncabezadoTarjeta
                  titulo="Datos de pacientes"
                  descripcion="Qué tan completa está la ficha base."
                  icono={<UserRoundPen className="size-4" />}
                />
                {estado ? (
                  <Completitud estado={estado} />
                ) : (
                  <div className="space-y-3">
                    {CAMPOS_BASE.map((c) => (
                      <Esqueleto key={c} className="h-6" />
                    ))}
                  </div>
                )}
              </Tarjeta>
            </div>
          </div>
        </>
      )}

      <Dialogo
        abierto={!!deshacer}
        alCerrar={() => !deshaciendo && setDeshacer(null)}
        titulo="¿Deshacer esta carga?"
        ancho="sm"
        pie={
          <>
            <Boton onClick={() => setDeshacer(null)} disabled={deshaciendo}>
              Cancelar
            </Boton>
            <Boton
              variante="peligro"
              cargando={deshaciendo}
              onClick={confirmarDeshacer}
            >
              Deshacer carga
            </Boton>
          </>
        }
      >
        {deshacer && (
          <p className="text-[14px] leading-relaxed text-suave">
            Se quitarán las filas que agregó, se restaurarán las que reemplazó y
            se descartarán sus filas con error y duplicados pendientes. Resumen:{" "}
            {resumenConteos(deshacer.conteos).toLowerCase()}.
          </p>
        )}
      </Dialogo>
    </div>
  )
}

function Indicador({
  icono,
  etiqueta,
  valor,
  tono,
  enlace,
  pequeno,
}: {
  icono: React.ReactNode
  etiqueta: string
  valor: React.ReactNode | null
  tono?: "aviso" | "exito"
  enlace?: string
  pequeno?: boolean
}) {
  const contenido = (
    <Tarjeta
      className={cn(
        "h-full transition-colors",
        enlace && "hover:border-borde-fuerte",
      )}
    >
      <p className="flex items-center gap-2 text-[12.5px] font-medium text-suave">
        <span
          className={cn(
            "text-tenue",
            tono === "aviso" && "text-aviso",
            tono === "exito" && "text-exito",
          )}
        >
          {icono}
        </span>
        {etiqueta}
      </p>
      {valor === null ? (
        <Esqueleto className="mt-3 h-8 w-24" />
      ) : (
        <p
          className={cn(
            "mt-2 font-semibold tracking-tight tabular-nums",
            pequeno ? "text-[20px] leading-9" : "text-[28px] leading-9",
            tono === "aviso" && "text-aviso",
          )}
        >
          {valor}
        </p>
      )}
    </Tarjeta>
  )
  return enlace ? (
    <Link
      to={enlace}
      className="block rounded-xl focus-visible:outline-2 focus-visible:outline-acento"
    >
      {contenido}
    </Link>
  ) : (
    contenido
  )
}

function Pendientes({ estado }: { estado: EstadoDatos }) {
  const items = [
    {
      n: estado.filasConError,
      icono: FileWarning,
      texto: plural(estado.filasConError, "fila con error", "filas con error"),
      detalle: "No se guardaron. Corríjalas o descártelas.",
      a: "/datos?pestana=errores",
    },
    {
      n: estado.duplicadosPendientes,
      icono: CopyX,
      texto: plural(
        estado.duplicadosPendientes,
        "duplicado por decidir",
        "duplicados por decidir",
      ),
      detalle: "Elija cuál conservar.",
      a: "/datos?pestana=duplicados",
    },
    {
      n: estado.pacientesIncompletos,
      icono: UserRoundPen,
      texto: plural(
        estado.pacientesIncompletos,
        "paciente con datos faltantes",
        "pacientes con datos faltantes",
      ),
      detalle: "Complete la ficha base.",
      a: "/datos?pestana=pacientes",
    },
  ].filter((i) => i.n > 0)
  return (
    <section aria-label="Pendientes" className="mb-6 grid gap-3 md:grid-cols-3">
      {items.map(({ icono: Icono, ...i }) => (
        <Link
          key={i.a}
          to={i.a}
          className="group flex items-start gap-3 rounded-xl border border-aviso/30 bg-aviso/8 p-4 transition-colors hover:border-aviso/60"
        >
          <Icono className="mt-0.5 size-4 shrink-0 text-aviso" />
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-medium">{i.texto}</span>
            <span className="block text-[12.5px] text-suave">{i.detalle}</span>
          </span>
          <ArrowRight className="mt-0.5 size-4 shrink-0 text-tenue transition-transform group-hover:translate-x-0.5" />
        </Link>
      ))}
    </section>
  )
}

function GraficoMeses({ datos }: { datos: EstadoDatos["filasPorMes"] }) {
  const c = useColoresTema()
  const opcion = useMemo<EChartsOption>(() => {
    const etiquetas = datos.map(({ mes }) => {
      const [a, m] = mes.split("-")
      return `${MESES_CORTOS[Number(m) - 1]} ${a.slice(2)}`
    })
    return {
      grid: { left: 8, right: 8, top: 16, bottom: 4, containLabel: true },
      tooltip: {
        trigger: "axis",
        backgroundColor: c.superficie,
        borderColor: c.borde,
        textStyle: { color: c.texto, fontSize: 12 },
        valueFormatter: (v) => `${entero(Number(v))} filas`,
      },
      xAxis: {
        type: "category",
        data: etiquetas,
        axisLine: { lineStyle: { color: c.borde } },
        axisTick: { show: false },
        axisLabel: { color: c.tenue, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: c.borde, type: "dashed" } },
        axisLabel: { color: c.tenue, fontSize: 11 },
      },
      series: [
        {
          type: "bar",
          data: datos.map((d) => d.filas),
          barMaxWidth: 28,
          itemStyle: { color: c.acento, borderRadius: [4, 4, 0, 0] },
          emphasis: { itemStyle: { opacity: 0.85 } },
        },
      ],
    }
  }, [datos, c])
  if (!datos.length)
    return (
      <p className="py-16 text-center text-[13.5px] text-suave">
        Ninguna fila tiene fecha reconocible.
      </p>
    )
  return (
    <Grafico
      opcion={opcion}
      alto={260}
      etiqueta={`Gráfico de barras de filas por mes: ${datos.map((d) => `${d.mes}, ${d.filas}`).join("; ")}`}
    />
  )
}

function Completitud({ estado }: { estado: EstadoDatos }) {
  return (
    <ul className="space-y-3.5">
      {CAMPOS_BASE.map((campo) => {
        const faltan = estado.faltantesPorCampo[campo] ?? 0
        const pct = estado.pacientes
          ? Math.round(((estado.pacientes - faltan) / estado.pacientes) * 100)
          : 0
        return (
          <li key={campo}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
              <span>{CAMPOS_CONOCIDOS[campo].etiqueta}</span>
              <span
                className={cn(
                  "tabular-nums",
                  pct === 100
                    ? "text-exito"
                    : pct < 70
                      ? "text-aviso"
                      : "text-suave",
                )}
              >
                {pct}%
              </span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-superficie-3"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={CAMPOS_CONOCIDOS[campo].etiqueta}
            >
              <div
                className={cn(
                  "h-full rounded-full",
                  pct === 100
                    ? "bg-exito"
                    : pct < 70
                      ? "bg-aviso"
                      : "bg-acento",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

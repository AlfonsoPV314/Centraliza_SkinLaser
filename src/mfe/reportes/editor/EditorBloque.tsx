import { useRef } from "react"
import {
  AreaChart,
  BarChart3,
  BarChartBig,
  Box,
  Grid3x3,
  LineChart,
  PieChart,
  ScatterChart,
  TrendingUp,
  Disc,
  ChartColumnStacked,
} from "lucide-react"
import type { ColumnaCatalogo } from "@/domain/model"
import { MARCADORES } from "@/domain/prose"
import {
  ETIQUETAS_MEDIDA,
  MEDIDAS_NUMERICAS,
  TODAS_LAS_MEDIDAS,
  type Medida,
} from "@/domain/stats"
import {
  ETIQUETAS_GRAFICO,
  REQUISITOS_GRAFICO,
  cambiarTipoGrafico,
  esNumerico,
  type Agregacion,
  type Bloque,
  type TipoGrafico,
} from "@/domain/templates"
import {
  AreaTexto,
  Campo,
  Entrada,
  Segmentado,
  Selector,
  SelectorMultiple,
  cn,
  type OpcionSelector,
} from "@/shared/ui"

const ICONOS_GRAFICO: Record<TipoGrafico, typeof BarChart3> = {
  barras: BarChart3,
  barras_apiladas: ChartColumnStacked,
  lineas: LineChart,
  tendencia: TrendingUp,
  areas: AreaChart,
  circular: PieChart,
  anillo: Disc,
  histograma: BarChartBig,
  dispersion: ScatterChart,
  caja: Box,
  heatmap: Grid3x3,
}

interface Props<B extends Bloque> {
  b: B
  alCambiar: (b: B) => void
  columnas: ColumnaCatalogo[]
  error: (campo: string) => string | undefined
}

const opcionesDe = (cols: ColumnaCatalogo[]): OpcionSelector[] =>
  cols.map((c) => ({
    valor: c.clave,
    etiqueta: c.etiqueta,
    grupo: c.clave.startsWith("__")
      ? "Derivados de la fecha"
      : c.origen === "extra"
        ? "Columnas adicionales"
        : "Columnas",
  }))

function SelectorCampo({
  id,
  valor,
  alCambiar,
  columnas,
  invalido,
  vacio = "Elegir campo…",
}: {
  id?: string
  valor: string | undefined
  alCambiar: (v: string) => void
  columnas: ColumnaCatalogo[]
  invalido?: boolean
  vacio?: string
}) {
  const grupos = new Map<string, ColumnaCatalogo[]>()
  for (const o of opcionesDe(columnas))
    grupos.set(o.grupo!, [
      ...(grupos.get(o.grupo!) ?? []),
      columnas.find((c) => c.clave === o.valor)!,
    ])
  return (
    <Selector
      id={id}
      value={valor ?? ""}
      onChange={(e) => alCambiar(e.target.value)}
      invalido={invalido}
    >
      <option value="">{vacio}</option>
      {valor && !columnas.some((c) => c.clave === valor) && (
        <option value={valor}>{valor} (no disponible)</option>
      )}
      {[...grupos].map(([g, cols]) => (
        <optgroup key={g} label={g}>
          {cols.map((c) => (
            <option key={c.clave} value={c.clave}>
              {c.etiqueta}
            </option>
          ))}
        </optgroup>
      ))}
    </Selector>
  )
}

export function EditorTabla({
  b,
  alCambiar,
  columnas,
  error,
}: Props<Extract<Bloque, { tipo: "tabla" }>>) {
  const datos = columnas.filter((c) => !c.clave.startsWith("__"))
  return (
    <Campo
      etiqueta="Columnas"
      ayuda="Se muestran en el orden en que las elijas."
      error={error("campos")}
    >
      <SelectorMultiple
        valores={b.campos}
        opciones={opcionesDe(datos)}
        alCambiar={(campos) => alCambiar({ ...b, campos })}
        marcador="Elegir columnas…"
        invalido={!!error("campos")}
      />
    </Campo>
  )
}

export function EditorGrafico({
  b,
  alCambiar,
  columnas,
  error,
}: Props<Extract<Bloque, { tipo: "grafico" }>>) {
  const r = REQUISITOS_GRAFICO[b.grafico]
  const numericas = columnas.filter(
    (c) => esNumerico(c.tipo) && !c.clave.startsWith("__"),
  )
  const categoricas = columnas.filter((c) => c.tipo !== "monto")
  const temporal =
    b.grafico === "lineas" || b.grafico === "tendencia" || b.grafico === "areas"
  const id = (c: string) => `${b.id}-${c}`

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[13px] font-medium">Tipo de gráfico</p>
        <div
          className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-6"
          role="radiogroup"
          aria-label="Tipo de gráfico"
        >
          {(Object.keys(ETIQUETAS_GRAFICO) as TipoGrafico[]).map((t) => {
            const Icono = ICONOS_GRAFICO[t]
            const activo = b.grafico === t
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={activo}
                title={ETIQUETAS_GRAFICO[t].ayuda}
                onClick={() => alCambiar(cambiarTipoGrafico(b, t))}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-[12px] transition-colors",
                  activo
                    ? "border-acento bg-acento-tenue font-medium text-acento"
                    : "border-borde text-suave hover:border-borde-fuerte hover:text-texto",
                )}
              >
                <Icono className="size-4.5" strokeWidth={1.75} />
                {ETIQUETAS_GRAFICO[t].nombre}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[12.5px] text-tenue">
          {ETIQUETAS_GRAFICO[b.grafico].ayuda}
        </p>
      </div>

      {b.grafico === "heatmap" ? (
        <p className="rounded-lg bg-superficie-2 px-3.5 py-2.5 text-[13px] text-suave">
          Cuenta filas por día de la semana y hora, tomados del campo de fecha
          de la plantilla. Las filas sin hora no se incluyen.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {r.x && (
            <Campo
              etiqueta={
                r.x === "numero"
                  ? "Valor a distribuir"
                  : temporal
                    ? "Eje de tiempo"
                    : "Agrupar por"
              }
              htmlFor={id("x")}
              error={error("campoX")}
              ayuda={
                temporal && !error("campoX")
                  ? "Usa Mes, Trimestre o Año para ver la evolución."
                  : undefined
              }
            >
              <SelectorCampo
                id={id("x")}
                valor={b.campoX}
                alCambiar={(campoX) => alCambiar({ ...b, campoX })}
                columnas={r.x === "numero" ? numericas : categoricas}
                invalido={!!error("campoX")}
              />
            </Campo>
          )}
          {r.y === "agregacion" && (
            <Campo etiqueta="Medir">
              <Segmentado<Agregacion>
                etiqueta="Agregación"
                valor={b.agregacion}
                alCambiar={(agregacion) =>
                  alCambiar({
                    ...b,
                    agregacion,
                    campoY:
                      agregacion === "conteo"
                        ? undefined
                        : (b.campoY ?? numericas[0]?.clave),
                  })
                }
                opciones={[
                  { valor: "conteo", etiqueta: "Cantidad" },
                  { valor: "suma", etiqueta: "Suma" },
                  { valor: "promedio", etiqueta: "Promedio" },
                ]}
              />
            </Campo>
          )}
          {(r.y === "numero" ||
            (r.y === "agregacion" && b.agregacion !== "conteo")) && (
            <Campo
              etiqueta={
                r.y === "numero"
                  ? "Valor numérico"
                  : `${b.agregacion === "suma" ? "Sumar" : "Promediar"}`
              }
              htmlFor={id("y")}
              error={error("campoY")}
            >
              <SelectorCampo
                id={id("y")}
                valor={b.campoY}
                alCambiar={(campoY) =>
                  alCambiar({ ...b, campoY: campoY || undefined })
                }
                columnas={numericas}
                invalido={!!error("campoY")}
              />
            </Campo>
          )}
          {r.serie && (
            <Campo
              etiqueta="Desglosar por"
              htmlFor={id("serie")}
              error={error("campoSerie")}
            >
              <SelectorCampo
                id={id("serie")}
                valor={b.campoSerie}
                alCambiar={(campoSerie) =>
                  alCambiar({ ...b, campoSerie: campoSerie || undefined })
                }
                columnas={categoricas.filter(
                  (c) => !c.clave.startsWith("__") || c.clave === b.campoSerie,
                )}
                invalido={!!error("campoSerie")}
              />
            </Campo>
          )}
        </div>
      )}
    </div>
  )
}

export function EditorMedidas({
  b,
  alCambiar,
  columnas,
  error,
}: Props<Extract<Bloque, { tipo: "medidas" }>>) {
  const tipo = columnas.find((c) => c.clave === b.campo)?.tipo
  const numerico = esNumerico(tipo)
  const disponibles = numerico
    ? TODAS_LAS_MEDIDAS
    : TODAS_LAS_MEDIDAS.filter(
        (m) => !MEDIDAS_NUMERICAS.includes(m) && m !== "variacion",
      )
  const cambiarCampo = (campo: string) => {
    const t = columnas.find((c) => c.clave === campo)?.tipo
    const medidas = esNumerico(t)
      ? b.medidas
      : b.medidas.filter(
          (m) => !MEDIDAS_NUMERICAS.includes(m) && m !== "variacion",
        )
    alCambiar({ ...b, campo, medidas: medidas.length ? medidas : ["conteo"] })
  }
  const alternar = (m: Medida) =>
    alCambiar({
      ...b,
      medidas: b.medidas.includes(m)
        ? b.medidas.filter((x) => x !== m)
        : TODAS_LAS_MEDIDAS.filter((x) => x === m || b.medidas.includes(x)),
    })

  return (
    <div className="space-y-4">
      <Campo
        etiqueta="Campo a resumir"
        htmlFor={`${b.id}-campo`}
        error={error("campo")}
        className="sm:max-w-xs"
      >
        <SelectorCampo
          id={`${b.id}-campo`}
          valor={b.campo}
          alCambiar={cambiarCampo}
          columnas={columnas.filter((c) => !c.clave.startsWith("__"))}
          invalido={!!error("campo")}
        />
      </Campo>
      <Campo
        etiqueta="Medidas"
        error={error("medidas")}
        ayuda={
          !numerico && tipo
            ? "Este campo no es numérico: solo aplican conteo, moda y porcentaje con dato."
            : undefined
        }
      >
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Medidas"
        >
          {disponibles.map((m) => {
            const activo = b.medidas.includes(m)
            return (
              <button
                key={m}
                type="button"
                aria-pressed={activo}
                onClick={() => alternar(m)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[13px] transition-colors",
                  activo
                    ? "border-acento bg-acento-tenue font-medium text-acento"
                    : "border-borde text-suave hover:border-borde-fuerte hover:text-texto",
                )}
              >
                {ETIQUETAS_MEDIDA[m]}
              </button>
            )
          })}
        </div>
      </Campo>
    </div>
  )
}

export function EditorTexto({
  b,
  alCambiar,
  columnas,
  error,
}: Props<Extract<Bloque, { tipo: "texto" }>>) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const insertar = (clave: string) => {
    const el = ref.current
    const marca = `{${clave}}`
    const ini = el?.selectionStart ?? b.texto.length
    const fin = el?.selectionEnd ?? b.texto.length
    alCambiar({
      ...b,
      texto: b.texto.slice(0, ini) + marca + b.texto.slice(fin),
    })
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(ini + marca.length, ini + marca.length)
    })
  }
  return (
    <div className="space-y-4">
      <Campo
        etiqueta="Campo descrito"
        htmlFor={`${b.id}-campo`}
        ayuda="Las medidas del texto ({promedio}, {suma}…) se calculan sobre este campo."
        error={error("campo")}
        className="sm:max-w-sm"
      >
        <SelectorCampo
          id={`${b.id}-campo`}
          valor={b.campo}
          alCambiar={(campo) => alCambiar({ ...b, campo })}
          columnas={columnas.filter((c) => !c.clave.startsWith("__"))}
          invalido={!!error("campo")}
        />
      </Campo>
      <Campo etiqueta="Texto" htmlFor={`${b.id}-texto`} error={error("texto")}>
        <AreaTexto
          ref={ref}
          id={`${b.id}-texto`}
          rows={5}
          value={b.texto}
          onChange={(e) => alCambiar({ ...b, texto: e.target.value })}
          invalido={!!error("texto")}
        />
      </Campo>
      <div>
        <p className="mb-1.5 text-[12px] font-medium text-tenue">
          Insertar dato
        </p>
        <div className="flex flex-wrap gap-1.5">
          {MARCADORES.map((m) => (
            <button
              key={m.clave}
              type="button"
              title={m.descripcion}
              onClick={() => insertar(m.clave)}
              className="num rounded-md bg-superficie-2 px-2 py-0.5 text-[12.5px] text-suave hover:bg-superficie-3 hover:text-texto"
            >
              {`{${m.clave}}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TituloBloque({
  b,
  alCambiar,
}: {
  b: Bloque
  alCambiar: (titulo: string) => void
}) {
  return (
    <Entrada
      value={b.titulo}
      onChange={(e) => alCambiar(e.target.value)}
      placeholder="Título (opcional)"
      aria-label="Título del bloque"
      className="max-w-sm"
    />
  )
}

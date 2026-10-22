import { useState } from "react"
import { CalendarMinus, CalendarPlus, ChevronDown, X } from "lucide-react"
import { DIAS_SEMANA, MESES_CORTOS } from "@/domain/dates"
import {
  bloqueTieneCriterios,
  bloqueVacio,
  describirRango,
  type BloqueRango,
  type RangoFechas,
} from "@/domain/ranges"
import { Boton, Entrada, Segmentado, cn } from "@/shared/ui"

type Lista = "anios" | "meses" | "trimestres" | "semestres" | "semanasMes" | "diasSemana" | "diasMes"

function Fichas({
  etiqueta,
  opciones,
  valores,
  alCambiar,
}: {
  etiqueta: string
  opciones: { valor: number; etiqueta: string }[]
  valores: number[]
  alCambiar: (v: number[]) => void
}) {
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-medium text-tenue">{etiqueta}</p>
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label={etiqueta}
      >
        {opciones.map((o) => {
          const activo = valores.includes(o.valor)
          return (
            <button
              key={o.valor}
              type="button"
              aria-pressed={activo}
              onClick={() =>
                alCambiar(
                  activo
                    ? valores.filter((v) => v !== o.valor)
                    : [...valores, o.valor].sort((a, b) => a - b),
                )
              }
              className={cn(
                "num min-w-10 rounded-md border px-2.5 py-1 text-[13px] transition-colors",
                activo
                  ? "border-acento bg-acento-tenue font-medium text-acento"
                  : "border-borde text-suave hover:border-borde-fuerte hover:text-texto",
              )}
            >
              {o.etiqueta}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const rango = (n: number, desde = 1) =>
  Array.from({ length: n }, (_, i) => i + desde)

function EditorBloque({
  b,
  primero,
  anios,
  alCambiar,
  alQuitar,
}: {
  b: BloqueRango
  primero: boolean
  anios: number[]
  alCambiar: (b: BloqueRango) => void
  alQuitar?: () => void
}) {
  const avanzados =
    b.trimestres.length +
      b.semestres.length +
      b.semanasMes.length +
      b.diasSemana.length +
      b.diasMes.length +
      b.fechas.length >
      0 || !!b.horaDesde
  const [mas, setMas] = useState(avanzados)
  const [fecha, setFecha] = useState("")
  const fijar = (k: Lista) => (v: number[]) => alCambiar({ ...b, [k]: v })
  const excluir = b.modo === "excluir"
  const fechasInvalidas = !!(b.desde && b.hasta && b.desde > b.hasta)

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        excluir
          ? "border-peligro/30 bg-peligro-tenue/30"
          : "border-borde bg-superficie",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {excluir ? (
          <CalendarMinus className="size-4 text-peligro" />
        ) : (
          <CalendarPlus className="size-4 text-acento" />
        )}
        {!excluir && !primero ? (
          <Segmentado
            tamano="sm"
            etiqueta="Cómo se combina con el bloque anterior"
            valor={b.union}
            alCambiar={(union) => alCambiar({ ...b, union })}
            opciones={[
              {
                valor: "O",
                etiqueta: "O bien",
                titulo: "Se suman las fechas de este bloque",
              },
              {
                valor: "Y",
                etiqueta: "Y además",
                titulo: "Solo las fechas que cumplen ambos bloques",
              },
            ]}
          />
        ) : (
          <span className="text-[13.5px] font-medium">
            {excluir ? "Excluir" : "Incluir"}
          </span>
        )}
        {alQuitar && (
          <Boton
            tamano="sm"
            variante="fantasma"
            soloIcono
            className="ml-auto"
            aria-label="Quitar bloque"
            icono={<X className="size-3.5" />}
            onClick={alQuitar}
          />
        )}
      </div>

      <div className="space-y-3.5">
        {anios.length > 0 && (
          <Fichas
            etiqueta="Años"
            opciones={anios.map((a) => ({ valor: a, etiqueta: String(a) }))}
            valores={b.anios}
            alCambiar={fijar("anios")}
          />
        )}
        <Fichas
          etiqueta="Meses"
          opciones={MESES_CORTOS.map((m, i) => ({ valor: i + 1, etiqueta: m }))}
          valores={b.meses}
          alCambiar={fijar("meses")}
        />
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[12px] font-medium text-tenue">
            Desde
            <Entrada
              type="date"
              className="mt-1 w-40"
              value={b.desde ?? ""}
              onChange={(e) =>
                alCambiar({ ...b, desde: e.target.value || undefined })
              }
              invalido={fechasInvalidas}
            />
          </label>
          <label className="text-[12px] font-medium text-tenue">
            Hasta
            <Entrada
              type="date"
              className="mt-1 w-40"
              value={b.hasta ?? ""}
              onChange={(e) =>
                alCambiar({ ...b, hasta: e.target.value || undefined })
              }
              invalido={fechasInvalidas}
            />
          </label>
          {fechasInvalidas && (
            <p className="pb-2 text-[12.5px] text-peligro">
              «Desde» debe ser anterior a «Hasta».
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMas(!mas)}
          className="flex items-center gap-1 text-[13px] text-acento hover:text-acento-fuerte"
          aria-expanded={mas}
        >
          <ChevronDown
            className={cn("size-3.5 transition-transform", mas && "rotate-180")}
          />
          {mas
            ? "Menos criterios"
            : "Trimestres, días de la semana, horario y más"}
        </button>

        {mas && (
          <div className="animar-aparecer space-y-3.5">
            <div className="flex flex-wrap gap-6">
              <Fichas
                etiqueta="Trimestres"
                opciones={rango(4).map((t) => ({
                  valor: t,
                  etiqueta: `${t}°`,
                }))}
                valores={b.trimestres}
                alCambiar={fijar("trimestres")}
              />
              <Fichas
                etiqueta="Semestres"
                opciones={rango(2).map((t) => ({
                  valor: t,
                  etiqueta: `${t}°`,
                }))}
                valores={b.semestres}
                alCambiar={fijar("semestres")}
              />
            </div>
            <Fichas
              etiqueta="Días de la semana"
              opciones={DIAS_SEMANA.map((d, i) => ({
                valor: i + 1,
                etiqueta: d.slice(0, 3),
              }))}
              valores={b.diasSemana}
              alCambiar={fijar("diasSemana")}
            />
            <Fichas
              etiqueta="Semanas del mes"
              opciones={rango(6).map((t) => ({ valor: t, etiqueta: `${t}ª` }))}
              valores={b.semanasMes}
              alCambiar={fijar("semanasMes")}
            />
            <Fichas
              etiqueta="Días del mes"
              opciones={rango(31).map((t) => ({
                valor: t,
                etiqueta: String(t),
              }))}
              valores={b.diasMes}
              alCambiar={fijar("diasMes")}
            />
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-tenue">
                Fechas puntuales
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {b.fechas.map((f) => (
                  <span
                    key={f}
                    className="num flex items-center gap-1 rounded-md bg-acento-tenue py-1 pr-1 pl-2.5 text-[13px] text-acento"
                  >
                    {f.split("-").reverse().join("-")}
                    <button
                      type="button"
                      onClick={() =>
                        alCambiar({
                          ...b,
                          fechas: b.fechas.filter((x) => x !== f),
                        })
                      }
                      aria-label={`Quitar ${f}`}
                      className="rounded p-0.5 hover:bg-acento/15"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <Entrada
                  type="date"
                  className="w-40"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  aria-label="Agregar fecha"
                />
                <Boton
                  tamano="sm"
                  disabled={!fecha || b.fechas.includes(fecha)}
                  onClick={() => (
                    alCambiar({ ...b, fechas: [...b.fechas, fecha].sort() }),
                    setFecha("")
                  )}
                >
                  Agregar
                </Boton>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-[12px] font-medium text-tenue">
                Hora desde
                <Entrada
                  type="time"
                  className="mt-1 w-32"
                  value={b.horaDesde ?? ""}
                  onChange={(e) =>
                    alCambiar({ ...b, horaDesde: e.target.value || undefined })
                  }
                />
              </label>
              <label className="text-[12px] font-medium text-tenue">
                Hora hasta
                <Entrada
                  type="time"
                  className="mt-1 w-32"
                  value={b.horaHasta ?? ""}
                  onChange={(e) =>
                    alCambiar({ ...b, horaHasta: e.target.value || undefined })
                  }
                />
              </label>
              <p className="pb-2 text-[12px] text-tenue">
                La hora final no se incluye.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function SelectorPeriodo({
  valor,
  alCambiar,
  anios,
}: {
  valor: RangoFechas
  alCambiar: (r: RangoFechas) => void
  anios: number[]
}) {
  const fijar = (i: number, b: BloqueRango) =>
    alCambiar({ bloques: valor.bloques.map((x, j) => (j === i ? b : x)) })
  const quitar = (i: number) =>
    alCambiar({ bloques: valor.bloques.filter((_, j) => j !== i) })
  const inclusiones = valor.bloques.filter((b) => b.modo === "incluir")
  const sinCriterio = !valor.bloques.some(
    (b) => b.modo === "incluir" && bloqueTieneCriterios(b),
  )

  return (
    <div className="space-y-3">
      {valor.bloques.map((b, i) => (
        <EditorBloque
          key={b.id}
          b={b}
          primero={b.modo === "incluir" && inclusiones[0]?.id === b.id}
          anios={anios}
          alCambiar={(n) => fijar(i, n)}
          alQuitar={valor.bloques.length > 1 ? () => quitar(i) : undefined}
        />
      ))}
      <div className="flex flex-wrap gap-2">
        <Boton
          tamano="sm"
          icono={<CalendarPlus className="size-3.5" />}
          onClick={() =>
            alCambiar({
              bloques: [...valor.bloques, bloqueVacio("incluir", "O")],
            })
          }
        >
          Agregar período
        </Boton>
        <Boton
          tamano="sm"
          variante="fantasma"
          icono={<CalendarMinus className="size-3.5" />}
          onClick={() =>
            alCambiar({ bloques: [...valor.bloques, bloqueVacio("excluir")] })
          }
        >
          Excluir fechas
        </Boton>
      </div>
      <p
        className={cn(
          "rounded-lg px-3.5 py-2.5 text-[13px]",
          sinCriterio
            ? "bg-aviso-tenue text-aviso"
            : "bg-superficie-2 text-suave",
        )}
      >
        {describirRango(valor)}
      </p>
    </div>
  )
}

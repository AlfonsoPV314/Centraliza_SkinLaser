import { useState } from "react"
import { ChevronDown, FileSpreadsheet, TriangleAlert } from "lucide-react"
import {
  CAMPOS_CONOCIDOS,
  LISTA_CAMPOS_CONOCIDOS,
  detectarTipoPlanilla,
  type MapeoColumna,
} from "@/domain/columns"
import type { TipoCampo, TipoPlanilla } from "@/domain/model"
import { claveDesdeEncabezado, limpiarOriginal } from "@/domain/text"
import type { AnalisisHoja } from "@/infrastructure/ingesta/lector"
import {
  Casilla,
  Insignia,
  Segmentado,
  Selector,
  Tarjeta,
  cn,
} from "@/shared/ui"
import { problemasMapeo } from "./preparar"

export interface HojaElegida {
  archivoId: string
  archivo: string
  analisis: AnalisisHoja
  incluir: boolean
  tipoPlanilla: TipoPlanilla
  mapeo: MapeoColumna[]
}

const GRUPOS: { grupo: string; etiqueta: string }[] = [
  { grupo: "base", etiqueta: "Datos base del paciente" },
  { grupo: "paciente", etiqueta: "Otros datos del paciente" },
  { grupo: "registro", etiqueta: "Registro en PhilaxMed" },
  { grupo: "pago", etiqueta: "Atención y pago" },
]

const TIPOS_EXTRA: { valor: TipoCampo; etiqueta: string }[] = [
  { valor: "texto", etiqueta: "Texto" },
  { valor: "numero", etiqueta: "Número" },
  { valor: "monto", etiqueta: "Monto" },
  { valor: "fecha", etiqueta: "Fecha" },
]

const resumenFila = (f: unknown[] | undefined) =>
  (f ?? [])
    .map(limpiarOriginal)
    .filter(Boolean)
    .slice(0, 4)
    .join(" · ")
    .slice(0, 70) || "(vacía)"

export function MapeoHoja({
  hoja,
  varias,
  alCambiar,
  alCambiarEncabezado,
  ocupada,
}: {
  hoja: HojaElegida
  varias: boolean
  alCambiar: (h: HojaElegida) => void
  alCambiarEncabezado: (fila: number) => void
  ocupada: boolean
}) {
  const [abierta, setAbierta] = useState(true)
  const a = hoja.analisis
  const problemas = hoja.incluir
    ? problemasMapeo(hoja.mapeo, hoja.tipoPlanilla)
    : []
  const ejemplos = a.vistaPrevia.slice(
    a.filaEncabezado + 1,
    a.filaEncabezado + 4,
  )
  const reconocidas = hoja.mapeo.filter(
    (m) => m.destino !== "extra" && m.destino !== "ignorar",
  ).length

  const cambiarDestino = (indice: number, valor: string) => {
    const mapeo = hoja.mapeo.map((m) => {
      if (m.indice !== indice) return m
      if (valor === "extra") {
        let clave =
          m.claveExtra ??
          (claveDesdeEncabezado(m.encabezado) || `columna_${m.indice + 1}`)
        if (clave in CAMPOS_CONOCIDOS) clave = `extra_${clave}`
        while (
          hoja.mapeo.some((o) => o.indice !== indice && o.claveExtra === clave)
        )
          clave = `${clave}_2`
        return {
          ...m,
          destino: "extra" as const,
          claveExtra: clave,
          tipoExtra: m.tipoExtra ?? "texto",
        }
      }
      return { ...m, destino: valor as MapeoColumna["destino"] }
    })
    alCambiar({ ...hoja, mapeo, tipoPlanilla: detectarTipoPlanilla(mapeo) })
  }

  return (
    <Tarjeta
      relleno={false}
      className={cn("overflow-hidden", !hoja.incluir && "opacity-70")}
    >
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-acento-tenue text-acento">
          <FileSpreadsheet className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-semibold">
            {hoja.archivo}
            {varias && (
              <span className="font-normal text-tenue">
                {" "}
                · hoja «{a.nombre}»
              </span>
            )}
          </p>
          <p className="text-[12.5px] text-tenue">
            {a.totalFilas.toLocaleString("es-CL")} filas · {reconocidas} de{" "}
            {hoja.mapeo.length} columnas reconocidas
          </p>
        </div>
        {problemas.length > 0 && (
          <Insignia tono="peligro" icono={<TriangleAlert className="size-3" />}>
            Revisar columnas
          </Insignia>
        )}
        <Casilla
          marcada={hoja.incluir}
          alCambiar={(incluir) => alCambiar({ ...hoja, incluir })}
        >
          Importar
        </Casilla>
        <button
          type="button"
          onClick={() => setAbierta(!abierta)}
          className="rounded-md p-1.5 text-tenue hover:bg-superficie-2 hover:text-texto"
          aria-expanded={abierta}
          aria-label={abierta ? "Ocultar columnas" : "Ver columnas"}
        >
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              abierta && "rotate-180",
            )}
          />
        </button>
      </div>

      {abierta && hoja.incluir && (
        <div className="border-t border-borde">
          <div className="flex flex-wrap items-end gap-4 bg-superficie-2 px-5 py-3">
            <label className="min-w-64 flex-1 text-[12.5px] text-tenue">
              Fila de títulos
              <Selector
                tamano="sm"
                className="mt-1"
                value={a.filaEncabezado}
                disabled={ocupada}
                onChange={(e) => alCambiarEncabezado(Number(e.target.value))}
              >
                {a.vistaPrevia.slice(0, 15).map((f, i) => (
                  <option key={i} value={i}>
                    Fila {i + 1}: {resumenFila(f)}
                  </option>
                ))}
              </Selector>
            </label>
            <div className="text-[12.5px] text-tenue">
              Tipo de planilla
              <Segmentado
                className="mt-1"
                tamano="sm"
                etiqueta="Tipo de planilla"
                valor={hoja.tipoPlanilla}
                alCambiar={(tipoPlanilla) =>
                  alCambiar({ ...hoja, tipoPlanilla })
                }
                opciones={[
                  { valor: "pacientes", etiqueta: "Pacientes" },
                  { valor: "pagos", etiqueta: "Pagos" },
                ]}
              />
            </div>
          </div>

          {problemas.length > 0 && (
            <ul className="space-y-1 border-b border-borde bg-peligro-tenue/50 px-5 py-2.5 text-[13px] text-peligro">
              {problemas.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="text-[12px] text-tenue">
                <tr className="border-b border-borde">
                  <th className="px-5 py-2 font-medium">
                    Columna en la planilla
                  </th>
                  <th className="px-5 py-2 font-medium">Ejemplos</th>
                  <th className="w-72 px-5 py-2 font-medium">Se guarda como</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde">
                {hoja.mapeo.map((m) => (
                  <tr
                    key={m.indice}
                    className={cn(m.destino === "ignorar" && "text-tenue")}
                  >
                    <td className="px-5 py-2.5">
                      <p className="font-medium">{m.encabezado}</p>
                      {m.confianza === "media" &&
                        m.destino !== "extra" &&
                        m.destino !== "ignorar" && (
                          <p className="text-[11.5px] text-aviso">
                            Coincidencia probable, confírmela
                          </p>
                        )}
                    </td>
                    <td className="max-w-64 px-5 py-2.5 text-suave">
                      <p className="truncate">
                        {ejemplos
                          .map((f) => limpiarOriginal(f[m.indice]))
                          .filter(Boolean)
                          .join(" · ") || (
                          <span className="text-tenue">Sin datos</span>
                        )}
                      </p>
                    </td>
                    <td className="px-5 py-2">
                      <div className="flex gap-2">
                        <Selector
                          tamano="sm"
                          className="flex-1"
                          value={m.destino}
                          onChange={(e) =>
                            cambiarDestino(m.indice, e.target.value)
                          }
                          aria-label={`Destino de «${m.encabezado}»`}
                        >
                          {GRUPOS.map((g) => (
                            <optgroup key={g.grupo} label={g.etiqueta}>
                              {LISTA_CAMPOS_CONOCIDOS.filter(
                                (c) => CAMPOS_CONOCIDOS[c].grupo === g.grupo,
                              ).map((c) => (
                                <option key={c} value={c}>
                                  {CAMPOS_CONOCIDOS[c].etiqueta}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                          <optgroup label="Otras">
                            <option value="extra">Columna adicional</option>
                            <option value="ignorar">No importar</option>
                          </optgroup>
                        </Selector>
                        {m.destino === "extra" && (
                          <Selector
                            tamano="sm"
                            className="w-28"
                            value={m.tipoExtra ?? "texto"}
                            onChange={(e) =>
                              alCambiar({
                                ...hoja,
                                mapeo: hoja.mapeo.map((o) =>
                                  o.indice === m.indice
                                    ? {
                                        ...o,
                                        tipoExtra: e.target.value as TipoCampo,
                                      }
                                    : o,
                                ),
                              })
                            }
                            aria-label="Tipo de dato"
                          >
                            {TIPOS_EXTRA.map((t) => (
                              <option key={t.valor} value={t.valor}>
                                {t.etiqueta}
                              </option>
                            ))}
                          </Selector>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Tarjeta>
  )
}

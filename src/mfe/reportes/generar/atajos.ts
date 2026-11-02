import { bloqueVacio, rangoAnio, type RangoFechas } from "@/domain/ranges"

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const entreFechas = (desde: Date, hasta: Date): RangoFechas => ({
  bloques: [{ ...bloqueVacio("incluir"), desde: iso(desde), hasta: iso(hasta) }],
})

/** Períodos frecuentes relativos a hoy. */
export function atajos(): { id: string; etiqueta: string; rango: () => RangoFechas }[] {
  const hoy = new Date()
  const a = hoy.getFullYear(),
    m = hoy.getMonth()
  const t = Math.floor(m / 3) * 3
  return [
    { id: "mes", etiqueta: "Este mes", rango: () => entreFechas(new Date(a, m, 1), new Date(a, m + 1, 0)) },
    { id: "mes_anterior", etiqueta: "Mes anterior", rango: () => entreFechas(new Date(a, m - 1, 1), new Date(a, m, 0)) },
    { id: "trimestre", etiqueta: "Este trimestre", rango: () => entreFechas(new Date(a, t, 1), new Date(a, t + 3, 0)) },
    { id: "12_meses", etiqueta: "Últimos 12 meses", rango: () => entreFechas(new Date(a, m - 11, 1), new Date(a, m + 1, 0)) },
    { id: "anio", etiqueta: "Este año", rango: () => rangoAnio(a) },
    { id: "anio_anterior", etiqueta: "Año anterior", rango: () => rangoAnio(a - 1) },
  ]
}

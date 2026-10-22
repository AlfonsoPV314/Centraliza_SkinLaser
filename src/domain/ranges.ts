// Selector de rangos de fechas: bloques de inclusión/exclusión combinables con Y/O.
// Reglas: dentro de un bloque, dimensiones con Y y valores de una dimensión con O.
// Entre bloques de inclusión: Y tiene precedencia sobre O. Las exclusiones se aplican al final.
import {
  DIAS_SEMANA,
  MESES,
  diaSemana,
  formatearFecha,
  partesFecha,
  semanaDelMes,
} from "./dates"
import { unirLista } from "./text"

export interface BloqueRango {
  id: string
  modo: "incluir" | "excluir"
  /** Unión con el bloque de inclusión anterior (se ignora en el primero y en exclusiones). */
  union: "Y" | "O"
  anios: number[]
  meses: number[] // 1–12
  trimestres: number[] // 1–4
  semestres: number[] // 1–2
  semanasMes: number[] // 1–6
  diasSemana: number[] // 1 = lunes … 7 = domingo
  diasMes: number[] // 1–31
  fechas: string[] // AAAA-MM-DD
  desde?: string
  hasta?: string
  horaDesde?: string // HH:mm (inclusive)
  horaHasta?: string // HH:mm (exclusiva)
}

export interface RangoFechas {
  bloques: BloqueRango[]
}

let n = 0
export function bloqueVacio(
  modo: "incluir" | "excluir" = "incluir",
  union: "Y" | "O" = "O",
): BloqueRango {
  return {
    id: `b${Date.now().toString(36)}${n++}`,
    modo,
    union,
    anios: [],
    meses: [],
    trimestres: [],
    semestres: [],
    semanasMes: [],
    diasSemana: [],
    diasMes: [],
    fechas: [],
  }
}

const tieneHorario = (b: BloqueRango) => !!(b.horaDesde && b.horaHasta)

export function bloqueTieneCriterios(b: BloqueRango): boolean {
  return (
    b.anios.length +
      b.meses.length +
      b.trimestres.length +
      b.semestres.length +
      b.semanasMes.length +
      b.diasSemana.length +
      b.diasMes.length +
      b.fechas.length >
      0 ||
    !!(b.desde && b.hasta) ||
    tieneHorario(b)
  )
}

/** Debe existir al menos un bloque de inclusión con algún criterio para poder generar. */
export function rangoValido(r: RangoFechas): boolean {
  return (
    r.bloques.some((b) => b.modo === "incluir" && bloqueTieneCriterios(b)) &&
    r.bloques.every((b) => !b.desde || !b.hasta || b.desde <= b.hasta)
  )
}

function enHorario(hora: string, desde: string, hasta: string): boolean {
  if (desde <= hasta) return hora >= desde && hora < hasta
  return hora >= desde || hora < hasta // rango que cruza medianoche
}

/** ¿La fecha (AAAA-MM-DD[THH:mm]) cumple todas las dimensiones del bloque? Sin hora no cumple un horario. */
export function coincideBloque(b: BloqueRango, fechaISO: string): boolean {
  const p = partesFecha(fechaISO)
  if (!p) return false
  const fecha = fechaISO.slice(0, 10)
  if (b.anios.length && !b.anios.includes(p.a)) return false
  if (b.meses.length && !b.meses.includes(p.m)) return false
  if (b.trimestres.length && !b.trimestres.includes(Math.ceil(p.m / 3)))
    return false
  if (b.semestres.length && !b.semestres.includes(p.m <= 6 ? 1 : 2))
    return false
  if (
    b.semanasMes.length &&
    !b.semanasMes.includes(semanaDelMes(p.a, p.m, p.d))
  )
    return false
  if (b.diasSemana.length && !b.diasSemana.includes(diaSemana(p.a, p.m, p.d)))
    return false
  if (b.diasMes.length && !b.diasMes.includes(p.d)) return false
  if (b.fechas.length && !b.fechas.includes(fecha)) return false
  if (b.desde && b.hasta && (fecha < b.desde || fecha > b.hasta)) return false
  if (tieneHorario(b)) {
    if (!p.hora) return false
    if (!enHorario(p.hora, b.horaDesde!, b.horaHasta!)) return false
  }
  return true
}

export function evaluarRango(
  r: RangoFechas,
  fechaISO: string | null | undefined,
): boolean {
  if (!fechaISO) return false
  const inclusiones = r.bloques.filter(
    (b) => b.modo === "incluir" && bloqueTieneCriterios(b),
  )
  if (inclusiones.length === 0) return false
  // Agrupa por O: cada grupo es una conjunción (Y) de bloques.
  const grupos: BloqueRango[][] = []
  inclusiones.forEach((b, i) => {
    if (i === 0 || b.union === "O") grupos.push([b])
    else grupos[grupos.length - 1].push(b)
  })
  if (!grupos.some((g) => g.every((b) => coincideBloque(b, fechaISO))))
    return false
  return !r.bloques.some(
    (b) =>
      b.modo === "excluir" &&
      bloqueTieneCriterios(b) &&
      coincideBloque(b, fechaISO),
  )
}

/** ¿El rango usa horarios? (para advertir sobre filas sin hora) */
export const rangoUsaHorario = (r: RangoFechas) =>
  r.bloques.some((b) => bloqueTieneCriterios(b) && tieneHorario(b))

// ---------- Resumen en lenguaje natural ----------

function tramos(valores: number[]): number[][] {
  const orden = [...new Set(valores)].sort((a, b) => a - b)
  const res: number[][] = []
  for (const v of orden) {
    const ult = res[res.length - 1]
    if (ult && v === ult[ult.length - 1] + 1) ult.push(v)
    else res.push([v])
  }
  return res
}

function describirSecuencia(
  valores: number[],
  nombre: (v: number) => string,
): string {
  return unirLista(
    tramos(valores).map((t) =>
      t.length >= 3
        ? `${nombre(t[0])} a ${nombre(t[t.length - 1])}`
        : t.map(nombre).join(", "),
    ),
  )
}

export function describirBloque(b: BloqueRango): string {
  const partes: string[] = []
  const meses = b.meses.length
    ? describirSecuencia(b.meses, (m) => MESES[m - 1])
    : ""
  const anios = b.anios.length ? describirSecuencia(b.anios, String) : ""
  if (meses && anios) partes.push(`${meses} de ${anios}`)
  else if (meses) partes.push(`${meses} de cualquier año`)
  else if (anios)
    partes.push(b.anios.length === 1 ? `todo ${anios}` : `los años ${anios}`)
  if (b.trimestres.length)
    partes.push(
      `${
        b.trimestres.length === 1 ? "el trimestre" : "los trimestres"
      } ${describirSecuencia(b.trimestres, (t) => `${t}°`)}`,
    )
  if (b.semestres.length)
    partes.push(
      `${
        b.semestres.length === 1 ? "el semestre" : "los semestres"
      } ${describirSecuencia(b.semestres, (s) => `${s}°`)}`,
    )
  if (b.desde && b.hasta)
    partes.push(`del ${formatearFecha(b.desde)} al ${formatearFecha(b.hasta)}`)
  if (b.fechas.length)
    partes.push(
      `${
        b.fechas.length === 1 ? "el día" : "los días"
      } ${unirLista([...b.fechas].sort().map((f) => formatearFecha(f)))}`,
    )
  if (b.semanasMes.length)
    partes.push(
      `${
        b.semanasMes.length === 1 ? "la semana" : "las semanas"
      } ${describirSecuencia(b.semanasMes, String)} de cada mes`,
    )
  if (b.diasSemana.length)
    partes.push(
      `solo ${describirSecuencia(b.diasSemana, (d) => DIAS_SEMANA[d - 1])}`,
    )
  if (b.diasMes.length)
    partes.push(
      `${
        b.diasMes.length === 1 ? "el día" : "los días"
      } ${describirSecuencia(b.diasMes, String)} de cada mes`,
    )
  if (tieneHorario(b)) partes.push(`de ${b.horaDesde} a ${b.horaHasta}`)
  return partes.join(", ")
}

export function describirRango(r: RangoFechas): string {
  const inclusiones = r.bloques.filter(
    (b) => b.modo === "incluir" && bloqueTieneCriterios(b),
  )
  const exclusiones = r.bloques.filter(
    (b) => b.modo === "excluir" && bloqueTieneCriterios(b),
  )
  if (inclusiones.length === 0)
    return "Aún no hay un período elegido. Agregue al menos un año, mes o fecha para poder generar."
  let texto = "Se incluirán: "
  inclusiones.forEach((b, i) => {
    if (i > 0) texto += b.union === "Y" ? " y además " : "; o bien "
    texto += describirBloque(b)
  })
  if (exclusiones.length)
    texto += `; se excluye ${unirLista(exclusiones.map(describirBloque))}`
  return `${texto}.`
}

/** Atajo: rango de un año completo. */
export function rangoAnio(anio: number): RangoFechas {
  return { bloques: [{ ...bloqueVacio("incluir"), anios: [anio] }] }
}

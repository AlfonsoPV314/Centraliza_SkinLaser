// Fechas en zona America/Santiago. Las fechas se guardan como texto local
// ("AAAA-MM-DD" o "AAAA-MM-DDTHH:mm") para evitar corrimientos por horario de verano.

export const ZONA_HORARIA = "America/Santiago"

export const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]
export const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
]
export const DIAS_SEMANA = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
]
export const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

export interface FechaParseada {
  fecha: string // AAAA-MM-DD
  hora?: string // HH:mm
}

const pad = (n: number) => String(n).padStart(2, "0")

export function hoyISO(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora)
}

export function ahoraISO(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(ahora)
  const p = (t: string) => partes.find((x) => x.type === t)?.value ?? "00"
  return `${p("year")}-${p("month")}-${p("day")}T${p("hour")}:${p("minute")}`
}

export function esFechaValida(a: number, m: number, d: number): boolean {
  if (!Number.isInteger(a) || !Number.isInteger(m) || !Number.isInteger(d))
    return false
  if (a < 1900 || a > 2100 || m < 1 || m > 12 || d < 1) return false
  const dias = new Date(Date.UTC(a, m, 0)).getUTCDate()
  return d <= dias
}

function horaValida(h: number, min: number) {
  return h >= 0 && h <= 23 && min >= 0 && min <= 59
}

/** Serial de Excel (sistema 1900) → fecha/hora local. */
export function serialExcelAFecha(serial: number): FechaParseada | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2958465) return null
  const ms = Math.round((serial - 25569) * 86400000)
  const d = new Date(ms)
  const fecha = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  const fraccion = serial % 1
  if (fraccion > 0.00001)
    return { fecha, hora: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` }
  return { fecha }
}

/**
 * Acepta dd/mm/aaaa, dd-mm-aaaa, aaaa-mm-dd (con hora opcional) y seriales de Excel.
 * Interpreta siempre día/mes/año (convención chilena).
 */
export function parsearFecha(valor: unknown): FechaParseada | null {
  if (valor === null || valor === undefined || valor === "") return null
  if (typeof valor === "number") return serialExcelAFecha(valor)
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return {
      fecha: `${valor.getFullYear()}-${pad(valor.getMonth() + 1)}-${pad(valor.getDate())}`,
    }
  }
  const s = String(valor).trim()
  if (/^\d{5}(\.\d+)?$/.test(s)) return serialExcelAFecha(Number(s))

  let a: number, m: number, d: number
  let h: number | undefined, min: number | undefined
  const iso = s.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?)?$/,
  )
  const dmy = s.match(
    /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::\d{2})?)?$/,
  )
  if (iso) {
    ;[a, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    if (iso[4] !== undefined) [h, min] = [Number(iso[4]), Number(iso[5])]
  } else if (dmy) {
    ;[d, m, a] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])]
    if (dmy[4] !== undefined) [h, min] = [Number(dmy[4]), Number(dmy[5])]
  } else {
    return null
  }
  if (!esFechaValida(a, m, d)) return null
  const fecha = `${a}-${pad(m)}-${pad(d)}`
  if (h !== undefined && min !== undefined) {
    if (!horaValida(h, min)) return null
    return { fecha, hora: `${pad(h)}:${pad(min)}` }
  }
  return { fecha }
}

/** "9:05", "09:05:00" o fracción de día de Excel → "HH:mm". */
export function parsearHora(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === "") return null
  if (typeof valor === "number") {
    if (valor < 0 || valor >= 1) return null
    const totalMin = Math.round(valor * 1440)
    return `${pad(Math.floor(totalMin / 60) % 24)}:${pad(totalMin % 60)}`
  }
  const m = String(valor)
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(hrs?\.?)?$/i)
  if (!m) return null
  const [h, min] = [Number(m[1]), Number(m[2])]
  return horaValida(h, min) ? `${pad(h)}:${pad(min)}` : null
}

export interface PartesFecha {
  a: number
  m: number
  d: number
  hora: string | null
}

export function partesFecha(iso: string): PartesFecha | null {
  const r = iso.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2}))?/)
  if (!r) return null
  return {
    a: Number(r[1]),
    m: Number(r[2]),
    d: Number(r[3]),
    hora: r[4] ?? null,
  }
}

/** 1 = lunes … 7 = domingo. */
export function diaSemana(a: number, m: number, d: number): number {
  const js = new Date(Date.UTC(a, m - 1, d)).getUTCDay()
  return js === 0 ? 7 : js
}

/** Semana del mes según calendario: la semana 1 contiene el día 1; semanas de lunes a domingo. */
export function semanaDelMes(a: number, m: number, d: number): number {
  const desfase = diaSemana(a, m, 1) - 1
  return Math.floor((d - 1 + desfase) / 7) + 1
}

/** "2025-03-04T09:30" → "04-03-2025 09:30". */
export function formatearFecha(
  iso: string | null | undefined,
  conHora = true,
): string {
  if (!iso) return ""
  const p = partesFecha(iso)
  if (!p) return iso
  const base = `${pad(p.d)}-${pad(p.m)}-${p.a}`
  return conHora && p.hora ? `${base} ${p.hora}` : base
}

/** Fecha/hora de un timestamp (ms) en zona Santiago, formato dd-mm-aaaa HH:mm. */
export function formatearMarcaTiempo(ms: number | string): string {
  const d = typeof ms === "string" ? new Date(ms) : new Date(ms)
  return formatearFecha(ahoraISO(d))
}

export function sumarDias(fecha: string, dias: number): string {
  const p = partesFecha(fecha)!
  const d = new Date(Date.UTC(p.a, p.m - 1, p.d + dias))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function diasEntre(desde: string, hasta: string): number {
  const a = partesFecha(desde)!,
    b = partesFecha(hasta)!
  return Math.round(
    (Date.UTC(b.a, b.m - 1, b.d) - Date.UTC(a.a, a.m - 1, a.d)) / 86400000,
  )
}

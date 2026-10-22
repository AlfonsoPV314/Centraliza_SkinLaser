// Textos de presentación reutilizados por varios módulos.
import type { ConteosImportacion } from "@/contracts"
import { formatearMarcaTiempo } from "@/domain/dates"
import { plural } from "@/domain/format"
import { unirLista } from "@/domain/text"

const rtf = new Intl.RelativeTimeFormat("es-CL", { numeric: "auto" })

export function tiempoRelativo(iso: string | null | undefined): string {
  if (!iso) return "—"
  const seg = (new Date(iso).getTime() - Date.now()) / 1000
  const abs = Math.abs(seg)
  if (abs < 60) return "hace un momento"
  if (abs < 3600) return rtf.format(Math.round(seg / 60), "minute")
  if (abs < 86400) return rtf.format(Math.round(seg / 3600), "hour")
  if (abs < 86400 * 7) return rtf.format(Math.round(seg / 86400), "day")
  return formatearMarcaTiempo(iso).slice(0, 10)
}

export function resumenConteos(c: ConteosImportacion): string {
  const partes: string[] = []
  if (c.nuevas) partes.push(plural(c.nuevas, "fila nueva", "filas nuevas"))
  if (c.reemplazadas)
    partes.push(plural(c.reemplazadas, "reemplazada", "reemplazadas"))
  if (c.ambas)
    partes.push(
      `${plural(c.ambas, "duplicado guardado", "duplicados guardados")} igual`,
    )
  if (c.descartadas)
    partes.push(plural(c.descartadas, "descartada", "descartadas"))
  if (c.conError)
    partes.push(`${plural(c.conError, "fila", "filas")} con error`)
  if (c.pendientes)
    partes.push(
      plural(c.pendientes, "duplicado pendiente", "duplicados pendientes"),
    )
  return partes.length ? unirLista(partes) : "Sin cambios"
}

export const saludo = () => {
  const h = Number(
    new Intl.DateTimeFormat("es-CL", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "America/Santiago",
    }).format(new Date()),
  )
  return h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches"
}

export const fechaLarga = () =>
  new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Santiago",
  }).format(new Date())

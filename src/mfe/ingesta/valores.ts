import type { ColumnaCatalogo, TipoCampo, ValorCampo } from "@/domain/model"
import { definicion } from "@/domain/columns"
import { formatearTelefono } from "@/domain/contact"
import { formatearFecha } from "@/domain/dates"
import { formatearCLP } from "@/domain/format"
import { formatearRun } from "@/domain/run"

export function etiquetaDe(clave: string, catalogo?: ColumnaCatalogo[] | null) {
  return (
    catalogo?.find((c) => c.clave === clave)?.etiqueta ??
    definicion(clave)?.etiqueta ??
    clave.replace(/_/g, " ")
  )
}

export function tipoDe(
  clave: string,
  catalogo?: ColumnaCatalogo[] | null,
): TipoCampo {
  return (
    definicion(clave)?.tipo ??
    catalogo?.find((c) => c.clave === clave)?.tipo ??
    "texto"
  )
}

/** Valor legible de un campo ya normalizado; si no se pudo normalizar, se muestra el original. */
export function mostrarValor(
  tipo: TipoCampo,
  v: ValorCampo | undefined,
): string {
  if (!v) return ""
  if (v.n === null || v.n === "") return v.o
  switch (tipo) {
    case "documento":
      return /^\d{1,9}-[\dK]$/i.test(v.n) ? formatearRun(v.n) : v.n
    case "fecha":
      return formatearFecha(v.n, v.n.includes("T"))
    case "monto":
      return formatearCLP(Number(v.n))
    case "telefono":
      return formatearTelefono(v.n)
    default:
      return v.o
  }
}

/** Valor crudo de la planilla como texto editable. */
export function crudoATexto(v: unknown): string {
  if (v === null || v === undefined) return ""
  if (v instanceof Date) return v.toLocaleDateString("es-CL")
  return String(v)
}

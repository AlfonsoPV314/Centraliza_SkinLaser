// Columnas configurables de la tabla de registros (Datos › Registros).
import { formatearFecha } from "@/domain/dates"
import { formatearCLP } from "@/domain/format"
import type { ColumnaCatalogo, FilaGuardada, TipoCampo } from "@/domain/model"
import { mostrarValor, tipoDe } from "../valores"

export interface ColumnaVisible {
  clave: string
  etiqueta: string
  detalle?: string
}

/** Columna sintética con el archivo y número de fila de origen. */
export const ORIGEN = "__origen"
export const PREDETERMINADAS = ["fecha_registro", "nombre_completo", "documento", "concepto", "monto", ORIGEN]
const CLAVE_ALMACEN = "skinlaser:registros-columnas"

const TIPOS: Record<TipoCampo, string> = {
  texto: "Texto",
  fecha: "Fecha",
  hora: "Hora",
  numero: "Número",
  monto: "Monto",
  documento: "Documento",
  email: "Correo",
  telefono: "Teléfono",
}

export function columnasDisponibles(catalogo: ColumnaCatalogo[]): ColumnaVisible[] {
  return [
    ...catalogo.map((c) => ({
      clave: c.clave,
      etiqueta: c.etiqueta,
      detalle: c.origen === "extra" ? `${TIPOS[c.tipo]} · adicional` : TIPOS[c.tipo],
    })),
    { clave: ORIGEN, etiqueta: "Origen (archivo y fila)" },
  ]
}

export function leerVisibles(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_ALMACEN) ?? "null")
    if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v
  } catch {
    /* valor corrupto: se usan las predeterminadas */
  }
  return [...PREDETERMINADAS]
}
export const guardarVisibles = (v: string[]) => localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(v))

/** Texto de una celda; cadena vacía si la fila no tiene valor. */
export function valorCelda(f: FilaGuardada, clave: string, catalogo: ColumnaCatalogo[] | null): string {
  switch (clave) {
    case ORIGEN:
      return `${f.archivo} · fila ${f.numero}`
    case "documento":
      return f.doc ? mostrarValor("documento", { o: f.doc, n: f.doc }) : ""
    case "fecha_registro":
      return f.fechaRegistro ? formatearFecha(f.fechaRegistro, f.fechaRegistro.includes("T")) : ""
    case "monto":
      return f.monto !== null ? formatearCLP(f.monto) : ""
    case "nombre_completo":
      return (
        f.campos.nombre_completo?.o ||
        [f.campos.nombres?.o, f.campos.apellido_paterno?.o, f.campos.apellido_materno?.o].filter(Boolean).join(" ")
      )
    default:
      return mostrarValor(tipoDe(clave, catalogo), f.campos[clave])
  }
}

export const alineadaDerecha = (clave: string, catalogo: ColumnaCatalogo[] | null) =>
  clave !== ORIGEN && ["monto", "numero"].includes(tipoDe(clave, catalogo))

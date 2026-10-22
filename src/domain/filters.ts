// Constructor de filtros con grupos anidados Y/O.
import { normalizarTexto } from "./text"
import { analizarDocumento } from "./run"
import type { Registro, TipoCampo } from "./model"

export type Operador = "igual" | "distinto" | "contiene" | "empieza" | "entre" | "mayor" | "menor" | "vacio" | "no_vacio" | "en_lista"

export interface Condicion {
  id: string
  tipo: "condicion"
  campo: string
  operador: Operador
  valor?: string
  valor2?: string
  valores?: string[]
}

export interface Grupo {
  id: string
  tipo: "grupo"
  union: "Y" | "O"
  hijos: (Condicion | Grupo)[]
}

export const ETIQUETAS_OPERADOR: Record<Operador, string> = {
  igual: "es igual a",
  distinto: "es distinto de",
  contiene: "contiene",
  empieza: "empieza con",
  entre: "está entre",
  mayor: "es mayor que",
  menor: "es menor que",
  vacio: "está vacío",
  no_vacio: "no está vacío",
  en_lista: "está en la lista",
}

export const OPERADORES_POR_TIPO: Record<TipoCampo, Operador[]> = {
  texto: [
    "contiene",
    "igual",
    "distinto",
    "empieza",
    "en_lista",
    "vacio",
    "no_vacio",
  ],
  email: ["contiene", "igual", "distinto", "empieza", "vacio", "no_vacio"],
  telefono: ["contiene", "igual", "empieza", "vacio", "no_vacio"],
  documento: ["igual", "distinto", "en_lista", "empieza", "contiene"],
  fecha: ["entre", "igual", "mayor", "menor", "vacio", "no_vacio"],
  hora: ["entre", "mayor", "menor", "vacio", "no_vacio"],
  numero: ["igual", "distinto", "mayor", "menor", "entre", "vacio", "no_vacio"],
  monto: ["igual", "distinto", "mayor", "menor", "entre", "vacio", "no_vacio"],
}

let contador = 0
export const nuevoId = (prefijo = "f") =>
  `${prefijo}${Date.now().toString(36)}${(contador++).toString(36)}`

export const grupoVacio = (union: "Y" | "O" = "Y"): Grupo => ({
  id: nuevoId("g"),
  tipo: "grupo",
  union,
  hijos: [],
})

export function condicionCompleta(c: Condicion): boolean {
  if (c.operador === "vacio" || c.operador === "no_vacio") return true
  if (c.operador === "en_lista") return (c.valores?.length ?? 0) > 0
  if (c.operador === "entre") return !!c.valor && !!c.valor2
  return !!c.valor && c.valor.trim() !== ""
}

function normalizarSegunTipo(
  tipo: TipoCampo,
  valor: string | number | null,
): string | number | null {
  if (valor === null || valor === "") return null
  if (tipo === "numero" || tipo === "monto") {
    const n =
      typeof valor === "number"
        ? valor
        : Number(String(valor).replace(/\./g, "").replace(",", "."))
    return Number.isFinite(n) ? n : null
  }
  if (tipo === "fecha") return String(valor).slice(0, 10)
  if (tipo === "documento")
    return analizarDocumento(valor).normalizado ?? normalizarTexto(valor)
  return normalizarTexto(valor)
}

export type TipoDe = (campo: string) => TipoCampo

export function evaluarCondicion(
  c: Condicion,
  registro: Registro,
  tipoDe: TipoDe,
): boolean {
  if (!condicionCompleta(c)) return true // las condiciones incompletas no filtran
  const tipo = tipoDe(c.campo)
  const v = normalizarSegunTipo(tipo, registro[c.campo] ?? null)
  if (c.operador === "vacio") return v === null
  if (c.operador === "no_vacio") return v !== null
  if (v === null) return c.operador === "distinto"
  const a = normalizarSegunTipo(tipo, c.valor ?? null)
  switch (c.operador) {
    case "igual":
      return v === a
    case "distinto":
      return v !== a
    case "contiene":
      return String(v).includes(String(a))
    case "empieza":
      return String(v).startsWith(String(a))
    case "mayor":
      return a !== null && v > a
    case "menor":
      return a !== null && v < a
    case "entre": {
      const b = normalizarSegunTipo(tipo, c.valor2 ?? null)
      return a !== null && b !== null && v >= a && v <= b
    }
    case "en_lista":
      return (c.valores ?? []).some((x) => normalizarSegunTipo(tipo, x) === v)
  }
}

export function evaluarFiltro(
  g: Grupo,
  registro: Registro,
  tipoDe: TipoDe,
): boolean {
  const activos = g.hijos.filter(
    (h) => h.tipo === "grupo" || condicionCompleta(h),
  )
  if (activos.length === 0) return true
  const ev = (h: Condicion | Grupo) =>
    h.tipo === "grupo"
      ? evaluarFiltro(h, registro, tipoDe)
      : evaluarCondicion(h, registro, tipoDe)
  return g.union === "Y" ? activos.every(ev) : activos.some(ev)
}

export function contarCondiciones(g: Grupo): number {
  return g.hijos.reduce(
    (n, h) =>
      n +
      (h.tipo === "grupo"
        ? contarCondiciones(h)
        : condicionCompleta(h)
          ? 1
          : 0),
    0,
  )
}

export function camposDeFiltro(g: Grupo): string[] {
  return g.hijos.flatMap((h) =>
    h.tipo === "grupo" ? camposDeFiltro(h) : [h.campo],
  )
}

/** Descripción en lenguaje natural: «Previsión contiene "fonasa" y (Monto es mayor que 50000 o …)». */
export function describirFiltro(
  g: Grupo,
  etiqueta: (campo: string) => string,
  raiz = true,
): string {
  const partes = g.hijos
    .filter((h) => h.tipo === "grupo" || condicionCompleta(h))
    .map((h) => {
      if (h.tipo === "grupo") {
        const d = describirFiltro(h, etiqueta, false)
        return d ? `(${d})` : ""
      }
      const op = ETIQUETAS_OPERADOR[h.operador]
      if (h.operador === "vacio" || h.operador === "no_vacio")
        return `${etiqueta(h.campo)} ${op}`
      if (h.operador === "entre")
        return `${etiqueta(h.campo)} ${op} «${h.valor}» y «${h.valor2}»`
      if (h.operador === "en_lista")
        return `${etiqueta(h.campo)} ${op} ${(h.valores ?? []).map((v) => `«${v}»`).join(", ")}`
      return `${etiqueta(h.campo)} ${op} «${h.valor}»`
    })
    .filter(Boolean)
  if (partes.length === 0)
    return raiz ? "Sin filtros: se incluyen todas las filas." : ""
  return partes.join(g.union === "Y" ? " y " : " o ")
}

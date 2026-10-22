// Detección de duplicados y consolidación de pagos fragmentados (REQ-01).
import type { TipoPlanilla } from "./model"

export interface FilaComparable {
  doc: string | null
  fechaRegistro: string | null
  tipoPlanilla: TipoPlanilla
  monto: number | null
  campos: Record<string, { o: string; n: string | null }>
}

/** Clave de duplicado: RUN/pasaporte normalizado + fecha (y hora, si existe) de registro en PhilaxMed. */
export function claveDuplicado(
  f: Pick<FilaComparable, "doc" | "fechaRegistro">,
): string | null {
  return f.doc && f.fechaRegistro ? `${f.doc}|${f.fechaRegistro}` : null
}

const n = (f: FilaComparable, campo: string) => f.campos[campo]?.n ?? ""

/**
 * Dos filas con la misma clave son duplicadas, salvo en planillas de pagos:
 * ahí, si difieren en monto, concepto o medio de pago, son fragmentos de una misma cita.
 */
export function sonDuplicadas(a: FilaComparable, b: FilaComparable): boolean {
  const ka = claveDuplicado(a)
  if (!ka || ka !== claveDuplicado(b)) return false
  if (a.tipoPlanilla === "pagos" || b.tipoPlanilla === "pagos") {
    return (
      a.monto === b.monto &&
      n(a, "concepto") === n(b, "concepto") &&
      n(a, "medio_pago") === n(b, "medio_pago")
    )
  }
  return true
}

export type Contraparte<L,> = { origen: "archivo"; indice: number } | {
  origen: "guardado"
  fila: L
}

export interface Coincidencia<L> {
  indiceNueva: number
  contra: Contraparte<L>
}

/** Compara cada fila nueva contra las anteriores del mismo lote y contra los datos ya guardados («legacy»). */
export function detectarDuplicados<N extends FilaComparable,
L extends FilaComparable,>(nuevas: N[], guardadas: L[]): Coincidencia<L>[] {
  const porClave = new Map<string, L[]>()
  for (const g of guardadas) {
    const k = claveDuplicado(g)
    if (!k) continue
    const lista = porClave.get(k) ?? []
    lista.push(g)
    porClave.set(k, lista)
  }
  const lote = new Map<string, number[]>()
  const coincidencias: Coincidencia<L>[] = []
  nuevas.forEach((fila, indiceNueva) => {
    const k = claveDuplicado(fila)
    if (!k) return
    const legacy = porClave.get(k)?.find((g) => sonDuplicadas(fila, g))
    if (legacy) {
      coincidencias.push({
        indiceNueva,
        contra: { origen: "guardado", fila: legacy },
      })
      return
    }
    const previas = lote.get(k) ?? []
    const previa = previas.find((i) => sonDuplicadas(fila, nuevas[i]))
    if (previa !== undefined) {
      coincidencias.push({
        indiceNueva,
        contra: { origen: "archivo", indice: previa },
      })
      return
    }
    previas.push(indiceNueva)
    lote.set(k, previas)
  })
  return coincidencias
}

export interface DetallePago {
  monto: number | null
  concepto: string
  medio: string
}

export interface CitaConsolidada {
  clave: string
  doc: string
  fechaRegistro: string | null
  profesional: string
  total: number
  detalle: DetallePago[]
  indices: number[]
}

/**
 * Clave de cita: si existe N° de atención se usa ese; si no, RUN + fecha/hora de registro + profesional.
 * (Supuesto B2, a validar con el cliente.)
 */
export function claveCita(f: FilaComparable): string | null {
  const id = f.campos.id_cita?.n
  if (id) return `cita:${id}`
  if (!f.doc || !f.fechaRegistro) return null
  return `${f.doc}|${f.fechaRegistro}|${n(f, "profesional")}`
}

/** Agrupa filas de pago fragmentadas en una cita/pago lógico, conservando el desglose. */
export function consolidarPagos(filas: FilaComparable[]): CitaConsolidada[] {
  const citas = new Map<string, CitaConsolidada>()
  filas.forEach((f, i) => {
    if (f.tipoPlanilla !== "pagos") return
    const clave = claveCita(f)
    if (!clave || !f.doc) return
    const cita = citas.get(clave) ?? {
      clave,
      doc: f.doc,
      fechaRegistro: f.fechaRegistro,
      profesional: f.campos.profesional?.o ?? "",
      total: 0,
      detalle: [],
      indices: [],
    }
    cita.total += f.monto ?? 0
    cita.detalle.push({
      monto: f.monto,
      concepto: f.campos.concepto?.o ?? "",
      medio: f.campos.medio_pago?.o ?? "",
    })
    cita.indices.push(i)
    citas.set(clave, cita)
  })
  return [...citas.values()]
}

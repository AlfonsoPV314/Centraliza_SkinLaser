// Operaciones de escritura compartidas por los servicios mock de ingesta y datos.
import type { FilaGuardada, FilaProcesada, Paciente } from "@/domain/model"
import { CAMPOS_BASE } from "@/domain/columns"
import { claveDuplicado } from "@/domain/duplicates"
import { db } from "./db"
import { ahora, uid } from "./util"

export const CAMPOS_PACIENTE = [
  ...CAMPOS_BASE,
  "nombres",
  "apellido_paterno",
  "apellido_materno",
  "telefono",
  "tipo_documento",
] as string[]

export function aGuardada(
  f: FilaProcesada,
  importacionId: string,
): FilaGuardada {
  return {
    id: uid("f-"),
    importacionId,
    archivo: f.archivo,
    numero: f.numero,
    tipoPlanilla: f.tipoPlanilla,
    doc: f.doc!,
    tipoDoc: f.tipoDoc!,
    fechaRegistro: f.fechaRegistro,
    monto: f.monto,
    campos: f.campos,
    claveDup: claveDuplicado(f),
    creadaEn: ahora(),
  }
}

/** Fusiona los atributos de paciente de una fila en su ficha: los valores nuevos no vacíos actualizan los anteriores. */
export function fusionarPaciente(
  previo: Paciente | undefined,
  f: Pick<FilaGuardada, "doc" | "tipoDoc" | "campos">,
): Paciente {
  const campos = { ...(previo?.campos ?? {}) }
  for (const c of CAMPOS_PACIENTE) {
    const v = f.campos[c]
    if (v && v.o !== "" && (c !== "email" || v.n)) campos[c] = v
  }
  return { doc: f.doc, tipoDoc: f.tipoDoc, campos, actualizadoEn: ahora() }
}

/** Guarda filas y actualiza las fichas de pacientes. Devuelve ids insertados y el estado previo de los pacientes. */
export async function guardarFilas(
  filas: FilaGuardada[],
  previos: Map<string, Paciente | null>,
) {
  if (!filas.length) return
  await db.filas.bulkPut(filas)
  const docs = [...new Set(filas.map((f) => f.doc))]
  const existentes = await db.pacientes.bulkGet(docs)
  const mapa = new Map<string, Paciente | undefined>(
    docs.map((d, i) => [d, existentes[i]]),
  )
  for (const d of docs) if (!previos.has(d)) previos.set(d, mapa.get(d) ?? null)
  for (const f of filas) mapa.set(f.doc, fusionarPaciente(mapa.get(f.doc), f))
  await db.pacientes.bulkPut(
    [...mapa.values()].filter((p): p is Paciente => !!p),
  )
}

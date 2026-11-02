// Combinación celda a celda de dos versiones de una misma fila duplicada.
import type { FilaGuardada, FilaProcesada, TipoCampo } from "./model"
import { procesarFila } from "./rules"

export type Lado = "anterior" | "nueva"
export type EleccionesCombinacion = Record<string, Lado>

/** Campos que el sistema deriva solo y no se eligen a mano. */
const DERIVADOS = new Set(["tipo_documento"])

const crudoDe = (f: FilaGuardada | FilaProcesada, clave: string): unknown =>
  "crudos" in f ? f.crudos[clave] : f.campos[clave]?.o

const vacio = (v: unknown) => v === undefined || v === null || String(v).trim() === ""

/** Campos comparables entre ambas versiones (con valor en al menos una). */
export function camposComparables(
  anterior: FilaGuardada | FilaProcesada,
  nueva: FilaProcesada,
): string[] {
  return [...new Set([...Object.keys(anterior.campos), ...Object.keys(nueva.campos)])].filter(
    (c) => !DERIVADOS.has(c) && (anterior.campos[c]?.o || nueva.campos[c]?.o),
  )
}

/** Lado sugerido: la versión nueva salvo que venga vacía. */
export const ladoSugerido = (
  anterior: FilaGuardada | FilaProcesada,
  nueva: FilaProcesada,
  clave: string,
): Lado => (vacio(crudoDe(nueva, clave)) && !vacio(crudoDe(anterior, clave)) ? "anterior" : "nueva")

/**
 * Arma una fila nueva tomando cada celda del lado elegido y la vuelve a validar completa,
 * de modo que la combinación no pueda saltarse las reglas. Conserva el origen de la versión nueva.
 */
export function combinarFilas(
  anterior: FilaGuardada | FilaProcesada,
  nueva: FilaProcesada,
  elecciones: EleccionesCombinacion,
  tiposExtra: Record<string, TipoCampo> = {},
): FilaProcesada {
  const crudos: Record<string, unknown> = {}
  for (const c of camposComparables(anterior, nueva)) {
    const lado = elecciones[c] ?? ladoSugerido(anterior, nueva, c)
    const v = crudoDe(lado === "anterior" ? anterior : nueva, c)
    if (!vacio(v)) crudos[c] = v
  }
  const pasaporte =
    "crudos" in anterior ? anterior.forzarPasaporte : anterior.tipoDoc === "pasaporte"
  return procesarFila(crudos, {
    uid: nueva.uid,
    archivo: nueva.archivo,
    hoja: nueva.hoja,
    numero: nueva.numero,
    tipoPlanilla: nueva.tipoPlanilla,
    tiposExtra,
    forzarPasaporte:
      (elecciones.documento === "anterior" ? pasaporte : nueva.forzarPasaporte) || undefined,
  })
}

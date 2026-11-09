// Transformaciones para aplicar la misma corrección o resolución a varias filas a la vez.
import { combinarFilas, camposComparables, ladoSugerido, type EleccionesCombinacion } from "./merge"
import type { FilaGuardada, FilaProcesada, TipoCampo } from "./model"
import { procesarFila } from "./rules"

/** Vuelve a validar la fila tratando su documento como pasaporte extranjero (sin dígito verificador de RUN). */
export function marcarPasaporte(f: FilaProcesada, tiposExtra: Record<string, TipoCampo> = {}): FilaProcesada {
  return procesarFila(f.crudos, {
    uid: f.uid,
    archivo: f.archivo,
    hoja: f.hoja,
    numero: f.numero,
    tipoPlanilla: f.tipoPlanilla,
    tiposExtra,
    forzarPasaporte: true,
  })
}

/** La fila tiene un error en el documento que podría resolverse marcándola como pasaporte. */
export const errorDeDocumento = (f: FilaProcesada) =>
  !f.forzarPasaporte && !!f.crudos.documento && f.problemas.some((p) => p.campo === "documento" && p.severidad === "error")

/**
 * «Actualizar datos» de un duplicado: parte de la fila guardada y toma de la nueva cada celda
 * que trae un valor; las celdas que llegan vacías conservan lo guardado.
 */
export function actualizarDatos(
  guardada: FilaGuardada | FilaProcesada,
  nueva: FilaProcesada,
  tiposExtra: Record<string, TipoCampo> = {},
): { fila: FilaProcesada; combinacion: EleccionesCombinacion } {
  const combinacion: EleccionesCombinacion = {}
  for (const c of camposComparables(guardada, nueva)) combinacion[c] = ladoSugerido(guardada, nueva, c)
  return { fila: combinarFilas(guardada, nueva, combinacion, tiposExtra), combinacion }
}

/// <reference lib="webworker" />
// Lee planillas (xlsx/xls/xlsm/csv/tsv/txt) fuera del hilo principal y las convierte en filas procesadas.
import * as XLSX from "xlsx"
import Papa from "papaparse"
import {
  detectarFilaEncabezado,
  detectarTipoPlanilla,
  sugerirMapeo,
} from "@/domain/columns"
import { procesarPlanilla } from "@/domain/rules"
import type {
  AnalisisArchivo,
  AnalisisHoja,
  PeticionWorker,
  RespuestaWorker,
} from "./protocolo"

const archivos = new Map<string, {
  nombre: string
  hojas: Map<string, unknown[][]>
}>()
const responder = (r: RespuestaWorker) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(r)

function decodificar(contenido: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true })
      .decode(contenido)
      .replace(/^\uFEFF/, "")
  } catch {
    // Exportaciones antiguas de Excel en Windows suelen venir en Windows-1252.
    return new TextDecoder("windows-1252").decode(contenido)
  }
}

function leer(
  nombre: string,
  contenido: ArrayBuffer,
): Map<string, unknown[][]> {
  const ext = nombre.split(".").pop()?.toLowerCase()
  if (ext === "csv" || ext === "tsv" || ext === "txt") {
    const r = Papa.parse<string[]>(decodificar(contenido), {
      skipEmptyLines: "greedy",
      delimiter: ext === "tsv" ? "\t" : "",
    })
    if (!r.data.length) throw new Error("El archivo está vacío.")
    return new Map([[nombre.replace(/\.[^.]+$/, ""), r.data]])
  }
  let libro: XLSX.WorkBook
  try {
    libro = XLSX.read(contenido, {
      type: "array",
      cellDates: false,
      dense: true,
    })
  } catch {
    throw new Error(
      "No se pudo abrir el archivo. Puede estar dañado o protegido con contraseña. Ábralo en Excel, guárdelo de nuevo y vuelva a intentarlo.",
    )
  }
  const hojas = new Map<string, unknown[][]>()
  for (const n of libro.SheetNames) {
    const filas = XLSX.utils.sheet_to_json<unknown[]>(libro.Sheets[n], {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    })
    if (filas.some((f) => f.some((c) => c !== null && String(c).trim() !== "")))
      hojas.set(n, filas)
  }
  if (!hojas.size) throw new Error("El archivo no tiene hojas con datos.")
  return hojas
}

function analizarHoja(
  nombre: string,
  filas: unknown[][],
  filaEncabezado?: number,
): AnalisisHoja {
  const enc = filaEncabezado ?? detectarFilaEncabezado(filas)
  const muestras = filas.slice(enc + 1, enc + 51)
  const mapeo = sugerirMapeo(filas[enc] ?? [], muestras)
  return {
    nombre,
    totalFilas: Math.max(0, filas.length - enc - 1),
    filaEncabezado: enc,
    vistaPrevia: filas.slice(0, Math.max(enc + 8, 15)),
    mapeo,
    tipoPlanilla: detectarTipoPlanilla(mapeo),
  }
}

self.onmessage = (e: MessageEvent<PeticionWorker>) => {
  const p = e.data
  try {
    if (p.tipo === "analizar") {
      const hojas = leer(p.nombre, p.contenido)
      archivos.set(p.archivoId, { nombre: p.nombre, hojas })
      const r: AnalisisArchivo = {
        archivoId: p.archivoId,
        nombre: p.nombre,
        hojas: [...hojas].map(([n, f]) => analizarHoja(n, f)),
      }
      responder({ id: p.id, tipo: "ok", resultado: r })
    } else if (p.tipo === "reanalizar") {
      const filas = archivos.get(p.archivoId)?.hojas.get(p.hoja)
      if (!filas)
        throw new Error(
          "El archivo ya no está disponible. Vuelva a seleccionarlo.",
        )
      responder({
        id: p.id,
        tipo: "ok",
        resultado: analizarHoja(p.hoja, filas, p.filaEncabezado),
      })
    } else if (p.tipo === "procesar") {
      const a = archivos.get(p.archivoId)
      const filas = a?.hojas.get(p.hoja)
      if (!a || !filas)
        throw new Error(
          "El archivo ya no está disponible. Vuelva a seleccionarlo.",
        )
      const resultado = procesarPlanilla(
        {
          archivo: a.nombre,
          hoja: a.hojas.size > 1 ? p.hoja : undefined,
          filas,
          filaEncabezado: p.filaEncabezado,
          mapeo: p.mapeo,
          tipoPlanilla: p.tipoPlanilla,
          prefijoUid: `${p.archivoId}-${p.hoja}`,
        },
        (proporcion) => responder({ id: p.id, tipo: "progreso", proporcion }),
      )
      responder({ id: p.id, tipo: "ok", resultado })
    } else if (p.tipo === "olvidar") {
      archivos.delete(p.archivoId)
      responder({ id: p.id, tipo: "ok", resultado: null })
    }
  } catch (err) {
    responder({
      id: p.id,
      tipo: "error",
      mensaje:
        err instanceof Error ? err.message : "No se pudo leer el archivo.",
    })
  }
}

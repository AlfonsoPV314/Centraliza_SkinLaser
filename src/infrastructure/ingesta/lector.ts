// Cliente del Web Worker de lectura de planillas.
import type { MapeoColumna } from "@/domain/columns"
import type { FilaProcesada, TipoPlanilla } from "@/domain/model"
import { EXTENSIONES_PERMITIDAS, LIMITE_ARCHIVO_MB } from "@/config/features"
import type {
  AnalisisArchivo,
  AnalisisHoja,
  PeticionWorker,
  RespuestaWorker,
} from "./protocolo"

export type { AnalisisArchivo, AnalisisHoja } from "./protocolo"

type Pendiente = {
  resolver: (v: unknown) => void
  rechazar: (e: Error) => void
  alAvanzar?: (p: number) => void
}

let worker: Worker | null = null
let siguiente = 1
const pendientes = new Map<number, Pendiente>()

function obtenerWorker() {
  if (worker) return worker
  worker = new Worker(new URL("./lector.worker.ts", import.meta.url), {
    type: "module",
  })
  worker.onmessage = (e: MessageEvent<RespuestaWorker>) => {
    const r = e.data
    const p = pendientes.get(r.id)
    if (!p) return
    if (r.tipo === "progreso") return p.alAvanzar?.(r.proporcion)
    pendientes.delete(r.id)
    if (r.tipo === "ok") p.resolver(r.resultado)
    else p.rechazar(new Error(r.mensaje))
  }
  worker.onerror = () => {
    for (const p of pendientes.values())
      p.rechazar(
        new Error(
          "Se interrumpió la lectura del archivo. Vuelva a intentarlo.",
        ),
      )
    pendientes.clear()
    worker = null
  }
  return worker
}

type SinId<T> = T extends unknown ? Omit<T, "id"> : never

function enviar<T>(
  m: SinId<PeticionWorker>,
  transferir: Transferable[] = [],
  alAvanzar?: (p: number) => void,
): Promise<T> {
  const id = siguiente++
  return new Promise<T>((resolver, rechazar) => {
    pendientes.set(id, {
      resolver: resolver as (v: unknown) => void,
      rechazar,
      alAvanzar,
    })
    obtenerWorker().postMessage({ ...m, id }, transferir)
  })
}

/** Valida extensión y tamaño antes de leer. Devuelve un mensaje para el usuario o null. */
export function validarArchivo(f: File): string | null {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? ""
  if (!(EXTENSIONES_PERMITIDAS as readonly string[]).includes(ext)) {
    return `«${f.name}» no es una planilla compatible. Use archivos ${EXTENSIONES_PERMITIDAS.map((e) => `.${e}`).join(", ")}.`
  }
  if (f.size > LIMITE_ARCHIVO_MB * 1024 * 1024)
    return `«${f.name}» pesa más de ${LIMITE_ARCHIVO_MB} MB. Divídalo en archivos más pequeños.`
  if (f.size === 0) return `«${f.name}» está vacío.`
  return null
}

export async function analizarArchivo(f: File): Promise<AnalisisArchivo> {
  const contenido = await f.arrayBuffer()
  const archivoId = `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  return enviar<AnalisisArchivo>(
    { tipo: "analizar", archivoId, nombre: f.name, contenido },
    [contenido],
  )
}

export const reanalizarHoja = (
  archivoId: string,
  hoja: string,
  filaEncabezado: number,
) =>
  enviar<AnalisisHoja>({ tipo: "reanalizar", archivoId, hoja, filaEncabezado })

export const procesarHoja = (
  archivoId: string,
  hoja: string,
  filaEncabezado: number,
  mapeo: MapeoColumna[],
  tipoPlanilla: TipoPlanilla,
  alAvanzar?: (p: number) => void,
) =>
  enviar<FilaProcesada[]>(
    { tipo: "procesar", archivoId, hoja, filaEncabezado, mapeo, tipoPlanilla },
    [],
    alAvanzar,
  )

export const olvidarArchivo = (archivoId: string) =>
  enviar<null>({ tipo: "olvidar", archivoId })

// Guardado de archivos generados: carpeta elegida (File System Access API) o descarga del navegador.
import { db } from "./mock/db"

type ManejadorCarpeta = FileSystemDirectoryHandle & {
  queryPermission?: (o: { mode: "readwrite" }) => Promise<PermissionState>
  requestPermission?: (o: { mode: "readwrite" }) => Promise<PermissionState>
}

const CLAVE = "carpeta-descarga"

export const carpetaDisponible = () =>
  typeof window !== "undefined" && "showDirectoryPicker" in window

/** Abre el selector de carpetas y recuerda la elección en este navegador. Devuelve el nombre o null si se canceló. */
export async function elegirCarpeta(): Promise<string | null> {
  if (!carpetaDisponible()) return null
  try {
    const h = await (window as unknown as {
      showDirectoryPicker: (o: object) => Promise<ManejadorCarpeta>
    }).showDirectoryPicker({ mode: "readwrite", id: "centraliza-reportes" })
    await db.ajustes.put({ clave: CLAVE, valor: h })
    return h.name
  } catch {
    return null
  }
}

export async function olvidarCarpeta() {
  await db.ajustes.delete(CLAVE)
}

async function carpetaGuardada(): Promise<ManejadorCarpeta | null> {
  const h = (await db.ajustes.get(CLAVE))?.valor as ManejadorCarpeta | undefined
  if (!h) return null
  const permiso =
    (await h.queryPermission?.({ mode: "readwrite" })) ?? "granted"
  if (permiso === "granted") return h
  return (await h.requestPermission?.({ mode: "readwrite" })) === "granted"
    ? h
    : null
}

function descargar(nombre: string, contenido: Blob) {
  const url = URL.createObjectURL(contenido)
  const a = document.createElement("a")
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** Guarda los archivos. Devuelve dónde quedaron, para informarlo al usuario. */
export async function guardarArchivos(
  archivos: { nombre: string; contenido: Blob }[],
  usarCarpeta: boolean,
): Promise<{ destino: "carpeta" | "descargas"; carpeta?: string }> {
  if (usarCarpeta && carpetaDisponible()) {
    try {
      const h = await carpetaGuardada()
      if (h) {
        for (const f of archivos) {
          const archivo = await h.getFileHandle(f.nombre, { create: true })
          const w = await archivo.createWritable()
          await w.write(f.contenido)
          await w.close()
        }
        return { destino: "carpeta", carpeta: h.name }
      }
    } catch {
      // Si la carpeta dejó de existir o se negó el permiso, se usa la descarga normal.
    }
  }
  archivos.forEach((f, i) =>
    setTimeout(() => descargar(f.nombre, f.contenido), i * 350),
  )
  return { destino: "descargas" }
}

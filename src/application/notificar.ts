import { reactive } from "vue"

export interface Toast {
  id: number
  tono: "exito" | "peligro" | "info"
  titulo: string
  detalle?: string
  accion?: { etiqueta: string; alHacer: () => void }
}

export type Notificar = (
  t: Omit<Toast, "id"> & { duracion?: number },
) => void

export const toasts = reactive<Toast[]>([])
let siguiente = 1

export function quitarToast(id: number) {
  const i = toasts.findIndex((t) => t.id === id)
  if (i >= 0) toasts.splice(i, 1)
}

const notificar: Notificar = ({ duracion, ...t }) => {
  const id = siguiente++
  if (toasts.length > 3) toasts.splice(0, toasts.length - 3)
  toasts.push({ ...t, id })
  setTimeout(() => quitarToast(id), duracion ?? (t.accion ? 9000 : 5000))
}

export const useNotificar = () => notificar

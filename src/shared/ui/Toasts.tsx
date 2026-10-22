import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { CheckCircle2, Info, OctagonAlert, X } from "lucide-react"
import { cn } from "./cn"

interface Toast {
  id: number
  tono: "exito" | "peligro" | "info"
  titulo: string
  detalle?: string
  accion?: { etiqueta: string; alHacer: () => void }
}

type Notificar = (t: Omit<Toast, "id"> & { duracion?: number }) => void
const Contexto = createContext<Notificar>(() => {})

export const useNotificar = () => useContext(Contexto)

let siguiente = 1

export function ProveedorToasts({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const quitar = useCallback(
    (id: number) => setToasts((l) => l.filter((t) => t.id !== id)),
    [],
  )
  const notificar = useCallback<Notificar>(
    ({ duracion, ...t }) => {
      const id = siguiente++
      setToasts((l) => [...l.slice(-3), { ...t, id }])
      setTimeout(() => quitar(id), duracion ?? (t.accion ? 9000 : 5000))
    },
    [quitar],
  )
  const valor = useMemo(() => notificar, [notificar])
  return (
    <Contexto.Provider value={valor}>
      {children}
      {createPortal(
        <div
          className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2"
          aria-live="polite"
        >
          {toasts.map((t) => {
            const Icono =
              t.tono === "exito"
                ? CheckCircle2
                : t.tono === "peligro"
                  ? OctagonAlert
                  : Info
            return (
              <div
                key={t.id}
                className="animar-deslizar pointer-events-auto flex items-start gap-3 rounded-xl border border-borde bg-superficie-2 p-3.5 shadow-2xl"
              >
                <Icono
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    t.tono === "exito"
                      ? "text-exito"
                      : t.tono === "peligro"
                        ? "text-peligro"
                        : "text-info",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t.titulo}</p>
                  {t.detalle && (
                    <p className="mt-0.5 text-[13px] text-suave">{t.detalle}</p>
                  )}
                </div>
                {t.accion && (
                  <button
                    className="shrink-0 rounded-md px-2 py-1 text-[13px] font-semibold text-acento hover:bg-acento-tenue"
                    onClick={() => {
                      t.accion!.alHacer()
                      quitar(t.id)
                    }}
                  >
                    {t.accion.etiqueta}
                  </button>
                )}
                <button
                  onClick={() => quitar(t.id)}
                  className="shrink-0 text-tenue hover:text-texto"
                  aria-label="Cerrar aviso"
                >
                  <X className="size-4" />
                </button>
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </Contexto.Provider>
  )
}

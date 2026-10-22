import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  Copy,
  ExternalLink,
  Inbox,
  Mail,
  MessageCircle,
  MessageSquareText,
  X,
} from "lucide-react"
import type { Mensaje } from "@/contracts"
import { useBuzon } from "@/application"
import { formatearMarcaTiempo } from "@/domain/dates"
import { Boton, Insignia, Vacio, cn, useNotificar } from "@/shared/ui"

const CANAL = {
  correo: { icono: Mail, nombre: "Correo" },
  sms: { icono: MessageSquareText, nombre: "SMS" },
  whatsapp: { icono: MessageCircle, nombre: "WhatsApp" },
} as const

/** Abre un enlace del buzón dentro de la aplicación (los enlaces usan rutas con #). */
function abrirEnlace(enlace: string) {
  const i = enlace.indexOf("#")
  if (i >= 0) window.location.hash = enlace.slice(i + 1)
  else window.location.href = enlace
}

function TarjetaMensaje({ m, alAbrir }: { m: Mensaje; alAbrir: () => void }) {
  const notificar = useNotificar()
  const C = CANAL[m.canal]
  return (
    <article
      className={cn(
        "rounded-xl border p-3.5",
        m.leido
          ? "border-borde bg-superficie"
          : "border-acento/30 bg-acento-tenue/40",
      )}
    >
      <header className="mb-1.5 flex items-center gap-2 text-[12px] text-tenue">
        <C.icono className="size-3.5" />
        <span className="font-medium text-suave">{C.nombre}</span>
        <span className="truncate">· {m.destino}</span>
        <span className="ml-auto shrink-0 num">
          {formatearMarcaTiempo(m.creadoEn).slice(-5)}
        </span>
      </header>
      <p className="text-[13.5px] font-medium">{m.asunto}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-suave">{m.cuerpo}</p>
      {(m.codigo || m.enlace) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {m.codigo && (
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-borde bg-superficie-2 px-2.5 py-1 font-mono text-[15px] tracking-[0.25em] hover:border-acento"
              onClick={() => {
                navigator.clipboard?.writeText(m.codigo!)
                notificar({
                  tono: "exito",
                  titulo: "Código copiado",
                  duracion: 2000,
                })
              }}
              title="Copiar código"
            >
              {m.codigo}
              <Copy className="size-3.5 text-tenue" />
            </button>
          )}
          {m.enlace && (
            <Boton
              tamano="sm"
              variante="primario"
              iconoDerecha={<ExternalLink className="size-3.5" />}
              onClick={() => {
                abrirEnlace(m.enlace!)
                alAbrir()
              }}
            >
              Abrir enlace
            </Boton>
          )}
        </div>
      )}
    </article>
  )
}

export function BuzonSimulado({
  variante = "flotante",
}: {
  variante?: "flotante" | "barra"
}) {
  const { mensajes, ultimo, noLeidos, marcarLeidos } = useBuzon()
  const [abierto, setAbierto] = useState(false)
  const notificar = useNotificar()
  const visto = useRef<string | null>(null)

  useEffect(() => {
    if (!ultimo || ultimo.id === visto.current) return
    visto.current = ultimo.id
    notificar({
      tono: "info",
      titulo: `Nuevo ${
        CANAL[ultimo.canal].nombre.toLowerCase() === "correo"
          ? "correo"
          : `mensaje por ${CANAL[ultimo.canal].nombre}`
      } simulado`,
      detalle: ultimo.asunto,
      accion: { etiqueta: "Ver", alHacer: () => setAbierto(true) },
    })
  }, [ultimo, notificar])

  useEffect(() => {
    if (!abierto) return
    const f = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false)
    document.addEventListener("keydown", f)
    return () => document.removeEventListener("keydown", f)
  }, [abierto])

  const cerrar = () => {
    setAbierto(false)
    if (noLeidos) marcarLeidos()
  }

  return (
    <>
      {variante === "flotante" ? (
        <button
          onClick={() => setAbierto(true)}
          className="fixed bottom-4 left-4 z-30 inline-flex h-10 items-center gap-2 rounded-full border border-borde bg-superficie-2 pr-4 pl-3 text-[13px] font-medium shadow-xl hover:border-acento"
          aria-label={`Buzón de prueba, ${noLeidos} sin leer`}
        >
          <Inbox className="size-4 text-acento" />
          Buzón de prueba
          {noLeidos > 0 && (
            <span className="num rounded-full bg-acento px-1.5 text-[11px] leading-[18px] text-sobre-acento">
              {noLeidos}
            </span>
          )}
        </button>
      ) : (
        <button
          onClick={() => setAbierto(true)}
          className="relative flex size-9 items-center justify-center rounded-lg text-suave hover:bg-superficie-2 hover:text-texto"
          aria-label={`Buzón de prueba, ${noLeidos} sin leer`}
          title="Buzón de prueba (correos y SMS simulados)"
        >
          <Inbox className="size-[18px]" />
          {noLeidos > 0 && (
            <span className="num absolute top-1 right-1 min-w-4 rounded-full bg-acento px-1 text-center text-[10px] leading-4 font-semibold text-sobre-acento">
              {noLeidos}
            </span>
          )}
        </button>
      )}
      {abierto &&
        createPortal(
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={cerrar}
              aria-hidden
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Buzón de prueba"
              className="animar-deslizar relative flex h-full w-full max-w-md flex-col border-l border-borde bg-fondo shadow-2xl"
            >
              <header className="flex items-start gap-3 border-b border-borde px-5 py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">Buzón de prueba</h2>
                    <Insignia tono="aviso">Solo prototipo</Insignia>
                  </div>
                  <p className="mt-1 text-[13px] text-suave">
                    Aquí llegan los correos, SMS y WhatsApp que el sistema
                    enviaría. Los enlaces y códigos funcionan.
                  </p>
                </div>
                <button
                  onClick={cerrar}
                  className="flex size-8 items-center justify-center rounded-md text-tenue hover:bg-superficie-2 hover:text-texto"
                  aria-label="Cerrar buzón"
                >
                  <X className="size-4" />
                </button>
              </header>
              <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
                {mensajes.length === 0 ? (
                  <Vacio
                    icono={<Inbox className="size-5" />}
                    titulo="Sin mensajes todavía"
                  >
                    Pruebe «¿Olvidó su contraseña?» o cambie su correo en el
                    perfil para ver los mensajes aquí.
                  </Vacio>
                ) : (
                  mensajes.map((m) => (
                    <TarjetaMensaje key={m.id} m={m} alAbrir={cerrar} />
                  ))
                )}
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </>
  )
}

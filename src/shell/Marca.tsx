import logoSkinLaser from "../assets/skinlaser-logo.png"
import { MARCA } from "@/config/brand"
import { cn } from "@/shared/ui"

/**
 * Isotipo de Centraliza: anillos concéntricos (como los de SkinLaser) abiertos a la izquierda,
 * por donde entran tres flujos de datos que convergen en un núcleo: información dispersa que se procesa y centraliza.
 */
export function Isotipo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("size-8 text-acento", className)}
      aria-hidden
      fill="none"
      strokeLinecap="round"
    >
      <path
        d="M10.42 12.82A20 20 0 1 1 10.42 35.18"
        stroke="currentColor"
        strokeWidth="2.2"
        opacity=".38"
      />
      <path
        d="M14.98 15.89A14.5 14.5 0 1 1 14.98 32.11"
        stroke="currentColor"
        strokeWidth="2.2"
        opacity=".65"
      />
      <path
        d="M19.54 18.97A9 9 0 1 1 19.54 29.03"
        stroke="currentColor"
        strokeWidth="2.2"
        opacity=".9"
      />
      <path
        d="M3 18.6h9M1.5 24h19M5 29.4h7"
        stroke="currentColor"
        strokeWidth="2.2"
        opacity=".75"
      />
      <circle cx="27" cy="24" r="3.6" fill="currentColor" />
    </svg>
  )
}

/** Mayúsculas con la A sin travesaño (Λ), al estilo del logo de SkinLaser. */
export const estilizar = (t: string) => t.toUpperCase().replace(/A/g, "Λ")

/** Logotipo: «CENTRΛLIZΛ» en tipografía geométrica, con la A sin travesaño como en SKINLΛSER. */
export function Logotipo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-marca text-[17px] font-semibold tracking-[0.12em] text-acento",
        className,
      )}
    >
      <span aria-hidden>{estilizar(MARCA.nombreCorto)}</span>
      <span className="sr-only">{MARCA.nombreCorto}</span>
    </span>
  )
}

export function Marca({
  compacta,
  className,
  claro,
}: {
  compacta?: boolean
  className?: string
  claro?: boolean
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Isotipo className={cn(claro && "text-[#52c3c6]")} />
      {!compacta && (
        <div className="leading-none">
          <Logotipo className={cn("block", claro && "text-[#52c3c6]")} />
          <p
            className={cn(
              "mt-1 text-[10.5px] tracking-wide",
              claro ? "text-white/50" : "text-tenue",
            )}
          >
            Gestión de datos · {MARCA.cliente}
          </p>
        </div>
      )}
    </div>
  )
}

/** Logo oficial del cliente (PNG con fondo transparente). */
export function LogoCliente({ className }: { className?: string }) {
  return (
    <img
      src={logoSkinLaser}
      alt={`${MARCA.cliente} · ${MARCA.descripcionCliente}`}
      className={cn("size-16 object-contain", className)}
    />
  )
}

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react"
import { LoaderCircle } from "lucide-react"
import { cn } from "./cn"

type Variante = "primario" | "secundario" | "fantasma" | "peligro" | "enlace"
type Tamano = "sm" | "md" | "lg"

export interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  tamano?: Tamano
  cargando?: boolean
  icono?: ReactNode
  iconoDerecha?: ReactNode
  soloIcono?: boolean
}

const VARIANTES: Record<Variante, string> = {
  primario:
    "bg-acento text-sobre-acento hover:bg-acento-fuerte font-medium shadow-sm",
  secundario:
    "bg-superficie-2 text-texto border border-borde hover:border-borde-fuerte hover:bg-superficie-3",
  fantasma: "text-suave hover:text-texto hover:bg-superficie-2",
  peligro:
    "bg-peligro-tenue text-peligro border border-peligro/30 hover:bg-peligro hover:text-white",
  enlace:
    "text-acento hover:text-acento-fuerte underline-offset-4 hover:underline px-0! h-auto!",
}

const TAMANOS: Record<Tamano, string> = {
  sm: "h-8 px-2.5 text-[13px] gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-lg",
}

export const Boton = forwardRef<HTMLButtonElement, BotonProps>(function Boton(
  {
    variante = "secundario",
    tamano = "md",
    cargando,
    icono,
    iconoDerecha,
    soloIcono,
    className,
    children,
    disabled,
    type = "button",
    ...resto
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-colors duration-150 select-none disabled:pointer-events-none disabled:opacity-50",
        VARIANTES[variante],
        TAMANOS[tamano],
        soloIcono &&
          (tamano === "sm"
            ? "w-8 px-0!"
            : tamano === "lg"
              ? "w-11 px-0!"
              : "w-9 px-0!"),
        className,
      )}
      {...resto}
    >
      {cargando ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
      ) : (
        icono
      )}
      {children}
      {iconoDerecha}
    </button>
  )
})

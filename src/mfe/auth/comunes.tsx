import { useEffect, useState, type ReactNode } from "react"
import { KeyRound } from "lucide-react"
import { cn } from "@/shared/ui"

export function EncabezadoAuth({
  titulo,
  descripcion,
  icono,
}: {
  titulo: string
  descripcion?: ReactNode
  icono?: ReactNode
}) {
  return (
    <div className="mb-7">
      {icono && (
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-acento-tenue text-acento">
          {icono}
        </div>
      )}
      <h1 className="text-[26px] leading-tight font-semibold tracking-tight">
        {titulo}
      </h1>
      {descripcion && (
        <p className="mt-2 text-[14.5px] leading-relaxed text-suave">
          {descripcion}
        </p>
      )}
    </div>
  )
}

interface CuentaDemo {
  correo: string
  contrasena: string
  rol: "administrador" | "usuario"
  nombreUsuario: string
}

/** Solo prototipo: atajos para entrar con las cuentas de demostración. */
export function CuentasDemo({
  alElegir,
}: {
  alElegir: (c: { correo: string; contrasena: string }) => void
}) {
  const [cuentas, setCuentas] = useState<CuentaDemo[]>([])
  useEffect(() => {
    import("@/infrastructure/mock").then((m) => setCuentas([...m.CUENTAS_DEMO]))
  }, [])
  if (!cuentas.length) return null
  return (
    <div className="mt-8 rounded-xl border border-dashed border-borde-fuerte p-4">
      <p className="mb-3 flex items-center gap-2 text-[12.5px] font-medium text-suave">
        <KeyRound className="size-3.5" /> Cuentas de demostración
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {cuentas.map((c) => (
          <button
            key={c.correo}
            type="button"
            onClick={() => alElegir(c)}
            className={cn(
              "rounded-lg border border-borde bg-superficie px-3 py-2 text-left transition-colors hover:border-acento",
            )}
          >
            <span className="block text-[13px] font-medium">
              {c.rol === "administrador" ? "Administrador" : "Usuario"}
            </span>
            <span className="block truncate text-[12px] text-tenue">
              {c.correo}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export const leerToken = (search: string) =>
  new URLSearchParams(search).get("token") ?? ""

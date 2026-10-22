import { Suspense } from "react"
import { Outlet } from "react-router"
import { MARCA } from "@/config/brand"
import { Insignia } from "@/shared/ui"
import { BuzonSimulado } from "./BuzonSimulado"
import { LogoCliente, Marca, estilizar } from "./Marca"
import { PantallaCarga } from "./estados"

/** Ilustración: planillas dispersas que convergen en una sola fuente ordenada. */
function Convergencia() {
  const filas = [
    { w: "62%", d: 0 },
    { w: "48%", d: 1 },
    { w: "74%", d: 2 },
    { w: "55%", d: 3 },
    { w: "68%", d: 4 },
  ]
  return (
    <div className="relative mx-auto mt-10 w-full max-w-sm" aria-hidden>
      <div className="grid grid-cols-3 gap-2.5 opacity-70">
        {["PhilaxMed · pacientes", "Pagos · marzo", "Planilla antigua"].map(
          (t, i) => (
            <div
              key={t}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-2"
              style={{
                transform: `rotate(${(i - 1) * 3}deg) translateY(${
                  i === 1 ? -6 : 0
                }px)`,
              }}
            >
              <p className="mb-1.5 truncate font-mono text-[9px] text-white/50">
                {t}
              </p>
              {[0, 1, 2, 3].map((k) => (
                <div
                  key={k}
                  className="mb-1 h-1 rounded bg-white/15"
                  style={{ width: `${50 + ((k * 17 + i * 11) % 45)}%` }}
                />
              ))}
            </div>
          ),
        )}
      </div>
      <svg
        viewBox="0 0 300 60"
        className="my-1 h-14 w-full text-[var(--color-acento)]"
      >
        <path
          d="M50 0 C50 30 150 25 150 60 M150 0 V60 M250 0 C250 30 150 25 150 60"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="3 4"
          opacity=".7"
        />
      </svg>
      <div className="rounded-xl border border-[color-mix(in_oklab,var(--color-acento)_45%,transparent)] bg-white/[0.06] p-3.5 shadow-2xl backdrop-blur">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[11px] font-medium text-white/80">
            Fuente única · validada
          </span>
          <span className="rounded bg-[var(--color-acento)] px-1.5 text-[10px] font-semibold text-[var(--color-sobre-acento)]">
            0 duplicados
          </span>
        </div>
        {filas.map((f) => (
          <div key={f.d} className="flex items-center gap-2 py-1">
            <span className="size-1.5 rounded-full bg-[var(--color-acento)]" />
            <div className="h-1.5 rounded bg-white/25" style={{ width: f.w }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function LayoutPublico() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(420px,5fr)_7fr]">
      <aside className="relative hidden overflow-hidden bg-[#0b1417] p-10 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -top-40 -left-32 size-[520px] rounded-full bg-[var(--color-acento)] opacity-[0.13] blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <Marca claro />
          <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pr-3.5 pl-1">
            <LogoCliente className="size-9" />
            <span className="text-[11px] leading-tight text-white/60">
              Preparado para
              <span className="block font-marca text-[12px] font-semibold tracking-[0.12em] text-[#52c3c6]">
                {estilizar(MARCA.cliente)}
              </span>
            </span>
          </div>
        </div>
        <div className="relative mt-auto mb-auto pt-16">
          <p className="mb-3 text-[12px] font-medium tracking-[0.14em] text-[#52c3c6] uppercase">
            {MARCA.cliente} · {MARCA.descripcionCliente}
          </p>
          <h1 className="max-w-md text-[34px] leading-[1.12] font-semibold tracking-tight text-balance">
            Todos los datos del centro, en un solo lugar y listos para usar.
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60">
            Cargue las planillas de PhilaxMed, deje que el sistema corrija
            formatos y detecte duplicados, y genere reportes en Excel o PDF en
            minutos.
          </p>
          <Convergencia />
        </div>
        <p className="relative text-[12px] text-white/40">
          {MARCA.nombreSistema} ·{" "}
          <span className="italic">
            {MARCA.etiquetaProvisional.toLowerCase()}
          </span>
        </p>
      </aside>
      <main className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between p-5 lg:justify-end">
          <Marca className="lg:hidden" />
          <Insignia tono="aviso">Prototipo · datos de demostración</Insignia>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pt-4 pb-20">
          <div className="w-full max-w-[420px]">
            <Suspense fallback={<PantallaCarga texto="Cargando…" />}>
              <Outlet />
            </Suspense>
          </div>
        </div>
      </main>
      <BuzonSimulado />
    </div>
  )
}

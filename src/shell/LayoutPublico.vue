<script setup lang="ts">
import { MARCA } from "@/config/brand"
import { Insignia } from "@/shared/ui"
import BuzonSimulado from "./BuzonSimulado.vue"
import LogoCliente from "./LogoCliente.vue"
import Marca from "./Marca.vue"
import { estilizar } from "./marca"

const FILAS = ["62%", "48%", "74%", "55%", "68%"]
const PLANILLAS = ["PhilaxMed · pacientes", "Pagos · marzo", "Planilla antigua"]
</script>

<template>
  <div class="grid min-h-screen lg:grid-cols-[minmax(420px,5fr)_7fr]">
    <aside class="relative hidden overflow-hidden bg-[#0b1417] p-10 text-white lg:flex lg:flex-col">
      <div
        class="pointer-events-none absolute -top-40 -left-32 size-[520px] rounded-full bg-[#52c3c6] opacity-[0.13] blur-3xl"
      />
      <div class="relative flex items-center justify-between gap-4">
        <Marca claro />
        <div class="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pr-3.5 pl-1">
          <LogoCliente class="size-9" />
          <span class="text-[11px] leading-tight text-white/60">
            Preparado para
            <span class="block font-marca text-[12px] font-semibold tracking-[0.12em] text-[#52c3c6]">
              {{ estilizar(MARCA.cliente) }}
            </span>
          </span>
        </div>
      </div>
      <div class="relative mt-auto mb-auto pt-16">
        <p class="mb-3 text-[12px] font-medium tracking-[0.14em] text-[#52c3c6] uppercase">
          {{ MARCA.cliente }} · {{ MARCA.descripcionCliente }}
        </p>
        <h1 class="max-w-md text-[34px] leading-[1.12] font-semibold tracking-tight text-balance">
          Todos los datos del centro, en un solo lugar y listos para usar.
        </h1>
        <p class="mt-4 max-w-md text-[15px] leading-relaxed text-white/60">
          Cargue las planillas de PhilaxMed, deje que el sistema corrija formatos y detecte duplicados, y
          genere reportes en Excel o PDF en minutos.
        </p>
        <!-- Ilustración: planillas dispersas que convergen en una sola fuente ordenada. -->
        <div class="relative mx-auto mt-10 w-full max-w-sm" aria-hidden="true">
          <div class="grid grid-cols-3 gap-2.5 opacity-70">
            <div
              v-for="(t, i) in PLANILLAS"
              :key="t"
              class="rounded-lg border border-white/10 bg-white/[0.04] p-2"
              :style="{ transform: `rotate(${(i - 1) * 3}deg) translateY(${i === 1 ? -6 : 0}px)` }"
            >
              <p class="mb-1.5 truncate font-mono text-[9px] text-white/50">{{ t }}</p>
              <div
                v-for="k in 4"
                :key="k"
                class="mb-1 h-1 rounded bg-white/15"
                :style="{ width: `${50 + ((k * 17 + i * 11) % 45)}%` }"
              />
            </div>
          </div>
          <svg viewBox="0 0 300 60" class="my-1 h-14 w-full text-[#52c3c6]">
            <path
              d="M50 0 C50 30 150 25 150 60 M150 0 V60 M250 0 C250 30 150 25 150 60"
              stroke="currentColor"
              stroke-width="1.5"
              fill="none"
              stroke-dasharray="3 4"
              opacity=".7"
            />
          </svg>
          <div class="rounded-xl border border-[#52c3c6]/45 bg-white/[0.06] p-3.5 shadow-2xl backdrop-blur">
            <div class="mb-2.5 flex items-center justify-between">
              <span class="text-[11px] font-medium text-white/80">Fuente única · validada</span>
              <span class="rounded bg-[#52c3c6] px-1.5 text-[10px] font-semibold text-[#032527]">0 duplicados</span>
            </div>
            <div v-for="w in FILAS" :key="w" class="flex items-center gap-2 py-1">
              <span class="size-1.5 rounded-full bg-[#52c3c6]" />
              <div class="h-1.5 rounded bg-white/25" :style="{ width: w }" />
            </div>
          </div>
        </div>
      </div>
      <p class="relative text-[12px] text-white/40">
        {{ MARCA.nombreSistema }} · <span class="italic">{{ MARCA.etiquetaProvisional.toLowerCase() }}</span>
      </p>
    </aside>
    <main class="flex min-h-screen flex-col">
      <div class="flex items-center justify-between p-5 lg:justify-end">
        <Marca class="lg:hidden" />
        <Insignia tono="aviso">Prototipo · datos de demostración</Insignia>
      </div>
      <div class="flex flex-1 items-center justify-center px-5 pt-4 pb-20">
        <div class="w-full max-w-[420px]"><slot /></div>
      </div>
    </main>
    <BuzonSimulado />
  </div>
</template>

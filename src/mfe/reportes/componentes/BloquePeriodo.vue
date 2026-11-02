<script setup lang="ts">
import { computed, ref } from "vue"
import { CalendarMinus, CalendarPlus, ChevronDown, X } from "@lucide/vue"
import { DIAS_SEMANA, MESES_CORTOS } from "@/domain/dates"
import type { BloqueRango } from "@/domain/ranges"
import { Boton, Entrada, Segmentado, cn } from "@/shared/ui"
import Fichas from "./Fichas.vue"

type Lista = "anios" | "meses" | "trimestres" | "semestres" | "semanasMes" | "diasSemana" | "diasMes"

const p = defineProps<{ b: BloqueRango; primero: boolean; anios: number[]; quitable: boolean }>()
const emit = defineEmits<{ cambiar: [b: BloqueRango]; quitar: [] }>()

const rango = (n: number) => Array.from({ length: n }, (_, i) => ({ valor: i + 1, etiqueta: `${i + 1}°` }))
const b = computed(() => p.b)
const mas = ref(
  p.b.trimestres.length +
    p.b.semestres.length +
    p.b.semanasMes.length +
    p.b.diasSemana.length +
    p.b.diasMes.length +
    p.b.fechas.length >
    0 || !!p.b.horaDesde,
)
const fecha = ref("")
const excluir = computed(() => p.b.modo === "excluir")
const fechasInvalidas = computed(() => !!(p.b.desde && p.b.hasta && p.b.desde > p.b.hasta))

const cambiar = (parcial: Partial<BloqueRango>) => emit("cambiar", { ...p.b, ...parcial })
const fijar = (k: Lista, v: number[]) => cambiar({ [k]: v })
const texto = (v: string | number | null | undefined) => (v ? String(v) : undefined)
function agregarFecha() {
  cambiar({ fechas: [...p.b.fechas, fecha.value].sort() })
  fecha.value = ""
}

const OPC_ANIOS = computed(() => p.anios.map((a) => ({ valor: a, etiqueta: String(a) })))
const OPC_MESES = MESES_CORTOS.map((m, i) => ({ valor: i + 1, etiqueta: m }))
const OPC_DIAS_SEMANA = DIAS_SEMANA.map((d, i) => ({ valor: i + 1, etiqueta: d.slice(0, 3) }))
const OPC_SEMANAS = Array.from({ length: 6 }, (_, i) => ({ valor: i + 1, etiqueta: `${i + 1}ª` }))
const OPC_DIAS_MES = Array.from({ length: 31 }, (_, i) => ({ valor: i + 1, etiqueta: String(i + 1) }))
</script>

<template>
  <div
    :class="
      cn('rounded-xl border p-4', excluir ? 'border-peligro/30 bg-peligro-tenue/30' : 'border-borde bg-superficie')
    "
  >
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <CalendarMinus v-if="excluir" class="size-4 text-peligro" aria-hidden="true" />
      <CalendarPlus v-else class="size-4 text-acento" aria-hidden="true" />
      <Segmentado
        v-if="!excluir && !primero"
        tamano="sm"
        etiqueta="Cómo se combina con el bloque anterior"
        :model-value="b.union"
        :opciones="[
          { valor: 'O', etiqueta: 'O bien', titulo: 'Se suman las fechas de este bloque' },
          { valor: 'Y', etiqueta: 'Y además', titulo: 'Solo las fechas que cumplen ambos bloques' },
        ]"
        @update:model-value="cambiar({ union: $event })"
      />
      <span v-else class="text-[13.5px] font-medium">{{ excluir ? "Excluir" : "Incluir" }}</span>
      <Boton
        v-if="quitable"
        tamano="sm"
        variante="fantasma"
        solo-icono
        class="ml-auto"
        aria-label="Quitar bloque"
        :icono="X"
        @click="emit('quitar')"
      />
    </div>

    <div class="space-y-3.5">
      <Fichas
        v-if="anios.length"
        etiqueta="Años"
        :opciones="OPC_ANIOS"
        :model-value="b.anios"
        @update:model-value="fijar('anios', $event)"
      />
      <Fichas etiqueta="Meses" :opciones="OPC_MESES" :model-value="b.meses" @update:model-value="fijar('meses', $event)" />
      <div class="flex flex-wrap items-end gap-2">
        <label class="text-[12px] font-medium text-tenue">
          Desde
          <Entrada
            type="date"
            class="mt-1 w-40"
            :model-value="b.desde ?? ''"
            :invalido="fechasInvalidas"
            @update:model-value="cambiar({ desde: texto($event) })"
          />
        </label>
        <label class="text-[12px] font-medium text-tenue">
          Hasta
          <Entrada
            type="date"
            class="mt-1 w-40"
            :model-value="b.hasta ?? ''"
            :invalido="fechasInvalidas"
            @update:model-value="cambiar({ hasta: texto($event) })"
          />
        </label>
        <p v-if="fechasInvalidas" class="pb-2 text-[12.5px] text-peligro" role="alert">
          «Desde» debe ser anterior a «Hasta».
        </p>
      </div>

      <button
        type="button"
        class="flex items-center gap-1 text-[13px] text-acento hover:text-acento-fuerte"
        :aria-expanded="mas"
        @click="mas = !mas"
      >
        <ChevronDown :class="cn('size-3.5 transition-transform', mas && 'rotate-180')" aria-hidden="true" />
        {{ mas ? "Menos criterios" : "Trimestres, días de la semana, horario y más" }}
      </button>

      <div v-if="mas" class="animar-aparecer space-y-3.5">
        <div class="flex flex-wrap gap-6">
          <Fichas
            etiqueta="Trimestres"
            :opciones="rango(4)"
            :model-value="b.trimestres"
            @update:model-value="fijar('trimestres', $event)"
          />
          <Fichas
            etiqueta="Semestres"
            :opciones="rango(2)"
            :model-value="b.semestres"
            @update:model-value="fijar('semestres', $event)"
          />
        </div>
        <Fichas
          etiqueta="Días de la semana"
          :opciones="OPC_DIAS_SEMANA"
          :model-value="b.diasSemana"
          @update:model-value="fijar('diasSemana', $event)"
        />
        <Fichas
          etiqueta="Semanas del mes"
          :opciones="OPC_SEMANAS"
          :model-value="b.semanasMes"
          @update:model-value="fijar('semanasMes', $event)"
        />
        <Fichas
          etiqueta="Días del mes"
          :opciones="OPC_DIAS_MES"
          :model-value="b.diasMes"
          @update:model-value="fijar('diasMes', $event)"
        />
        <div>
          <p class="mb-1.5 text-[12px] font-medium text-tenue">Fechas puntuales</p>
          <div class="flex flex-wrap items-center gap-1.5">
            <span
              v-for="f in b.fechas"
              :key="f"
              class="num flex items-center gap-1 rounded-md bg-acento-tenue py-1 pr-1 pl-2.5 text-[13px] text-acento"
            >
              {{ f.split("-").reverse().join("-") }}
              <button
                type="button"
                class="rounded p-0.5 hover:bg-acento/15"
                :aria-label="`Quitar ${f}`"
                @click="cambiar({ fechas: b.fechas.filter((x) => x !== f) })"
              >
                <X class="size-3" aria-hidden="true" />
              </button>
            </span>
            <Entrada
              type="date"
              class="w-40"
              aria-label="Agregar fecha"
              :model-value="fecha"
              @update:model-value="fecha = String($event ?? '')"
            />
            <Boton tamano="sm" :disabled="!fecha || b.fechas.includes(fecha)" @click="agregarFecha">Agregar</Boton>
          </div>
        </div>
        <div class="flex flex-wrap items-end gap-2">
          <label class="text-[12px] font-medium text-tenue">
            Hora desde
            <Entrada
              type="time"
              class="mt-1 w-32"
              :model-value="b.horaDesde ?? ''"
              @update:model-value="cambiar({ horaDesde: texto($event) })"
            />
          </label>
          <label class="text-[12px] font-medium text-tenue">
            Hora hasta
            <Entrada
              type="time"
              class="mt-1 w-32"
              :model-value="b.horaHasta ?? ''"
              @update:model-value="cambiar({ horaHasta: texto($event) })"
            />
          </label>
          <p class="pb-2 text-[12px] text-tenue">La hora final no se incluye.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { ChevronLeft, ChevronRight } from "@lucide/vue"
import { cn } from "./cn"

const pagina = defineModel<number>({ required: true })
const p = defineProps<{ total: number; porPagina: number }>()
const paginas = computed(() => Math.max(1, Math.ceil(p.total / p.porPagina)))
const desde = computed(() => (pagina.value - 1) * p.porPagina + 1)
const hasta = computed(() => Math.min(p.total, pagina.value * p.porPagina))
const numeros = computed(() => {
  const n: (number | "…")[] = []
  for (let i = 1; i <= paginas.value; i++) {
    if (i === 1 || i === paginas.value || Math.abs(i - pagina.value) <= 1) n.push(i)
    else if (n[n.length - 1] !== "…") n.push("…")
  }
  return n
})
const f = (n: number) => n.toLocaleString("es-CL")
</script>

<template>
  <nav
    v-if="total > 0"
    aria-label="Paginación"
    class="flex flex-wrap items-center justify-between gap-3 text-[13px] text-suave"
  >
    <span class="num">{{ f(desde) }}–{{ f(hasta) }} de {{ f(total) }}</span>
    <div v-if="paginas > 1" class="flex items-center gap-1">
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded-md hover:bg-superficie-2 disabled:opacity-40"
        :disabled="pagina <= 1"
        aria-label="Página anterior"
        @click="pagina--"
      >
        <ChevronLeft class="size-4" />
      </button>
      <template v-for="(n, i) in numeros" :key="`${n}-${i}`">
        <span v-if="n === '…'" class="px-1 text-tenue">…</span>
        <button
          v-else
          type="button"
          :aria-current="n === pagina ? 'page' : undefined"
          :class="cn('num h-8 min-w-8 rounded-md px-2 font-medium', n === pagina ? 'bg-acento-tenue text-acento' : 'hover:bg-superficie-2')"
          @click="pagina = n"
        >
          {{ n }}
        </button>
      </template>
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded-md hover:bg-superficie-2 disabled:opacity-40"
        :disabled="pagina >= paginas"
        aria-label="Página siguiente"
        @click="pagina++"
      >
        <ChevronRight class="size-4" />
      </button>
    </div>
  </nav>
</template>

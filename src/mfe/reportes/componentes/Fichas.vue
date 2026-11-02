<script setup lang="ts">
import { cn } from "@/shared/ui"

/** Grupo de fichas conmutables para elegir varios números (años, meses, días…). */
const valores = defineModel<number[]>({ required: true })
defineProps<{ etiqueta: string; opciones: { valor: number; etiqueta: string }[] }>()

const alternar = (v: number) =>
  (valores.value = valores.value.includes(v)
    ? valores.value.filter((x) => x !== v)
    : [...valores.value, v].sort((a, b) => a - b))
</script>

<template>
  <div>
    <p class="mb-1.5 text-[12px] font-medium text-tenue">{{ etiqueta }}</p>
    <div class="flex flex-wrap gap-1.5" role="group" :aria-label="etiqueta">
      <button
        v-for="o in opciones"
        :key="o.valor"
        type="button"
        :aria-pressed="valores.includes(o.valor)"
        :class="
          cn(
            'num min-w-10 rounded-md border px-2.5 py-1 text-[13px] transition-colors',
            valores.includes(o.valor)
              ? 'border-acento bg-acento-tenue font-medium text-acento'
              : 'border-borde text-suave hover:border-borde-fuerte hover:text-texto',
          )
        "
        @click="alternar(o.valor)"
      >
        {{ o.etiqueta }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
import type { Component } from "vue"
import { cn } from "./cn"

const valor = defineModel<T>({ required: true })
withDefaults(
  defineProps<{
    opciones: { valor: T; etiqueta: string; icono?: Component; titulo?: string }[]
    tamano?: "sm" | "md"
    etiqueta?: string
  }>(),
  { tamano: "md" },
)
</script>

<template>
  <div
    role="radiogroup"
    :aria-label="etiqueta"
    class="inline-flex rounded-lg border border-borde bg-superficie-2 p-0.5"
  >
    <button
      v-for="o in opciones"
      :key="o.valor"
      type="button"
      role="radio"
      :aria-checked="valor === o.valor"
      :title="o.titulo"
      :class="
        cn(
          'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors',
          tamano === 'sm' ? 'h-7 px-2.5 text-[12.5px]' : 'h-8 px-3 text-[13px]',
          valor === o.valor
            ? 'bg-superficie text-texto shadow-sm ring-1 ring-borde'
            : 'text-suave hover:text-texto',
        )
      "
      @click="valor = o.valor"
    >
      <component :is="o.icono" v-if="o.icono" class="size-3.5" />
      {{ o.etiqueta }}
    </button>
  </div>
</template>

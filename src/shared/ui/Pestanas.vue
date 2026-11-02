<script setup lang="ts" generic="T extends string">
import type { Component } from "vue"
import { cn } from "./cn"

const valor = defineModel<T>({ required: true })
defineProps<{
  pestanas: { valor: T; etiqueta: string; contador?: number; icono?: Component }[]
}>()
</script>

<template>
  <div role="tablist" class="flex gap-1 overflow-x-auto border-b border-borde">
    <button
      v-for="p in pestanas"
      :key="p.valor"
      role="tab"
      type="button"
      :aria-selected="p.valor === valor"
      :class="
        cn(
          'relative -mb-px flex h-10 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors',
          p.valor === valor ? 'border-acento text-texto' : 'border-transparent text-suave hover:text-texto',
        )
      "
      @click="valor = p.valor"
    >
      <component :is="p.icono" v-if="p.icono" class="size-4" />
      {{ p.etiqueta }}
      <span
        v-if="p.contador"
        :class="
          cn(
            'num rounded-full px-1.5 text-[11px] leading-[18px]',
            p.valor === valor ? 'bg-acento text-sobre-acento' : 'bg-superficie-3 text-suave',
          )
        "
      >
        {{ p.contador.toLocaleString("es-CL") }}
      </span>
    </button>
  </div>
</template>

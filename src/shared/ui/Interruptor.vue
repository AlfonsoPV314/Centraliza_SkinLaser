<script setup lang="ts">
import { cn } from "./cn"

const activo = defineModel<boolean>({ default: false })
defineProps<{ etiqueta: string; descripcion?: string; deshabilitado?: boolean }>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="activo"
    :disabled="deshabilitado"
    class="flex w-full items-start justify-between gap-4 text-left disabled:opacity-50"
    @click="activo = !activo"
  >
    <span class="flex flex-col">
      <span class="text-sm font-medium">{{ etiqueta }}</span>
      <span v-if="descripcion" class="text-[12.5px] text-tenue">{{ descripcion }}</span>
    </span>
    <span
      :class="
        cn(
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors',
          activo ? 'bg-acento' : 'bg-superficie-3 ring-1 ring-borde-fuerte',
        )
      "
    >
      <span
        :class="
          cn(
            'absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform',
            activo ? 'translate-x-4.5' : 'translate-x-0.5',
          )
        "
      />
    </span>
  </button>
</template>

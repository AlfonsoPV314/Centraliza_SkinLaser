<script setup lang="ts">
import { useId } from "vue"
import { Check } from "@lucide/vue"
import { cn } from "./cn"

const marcada = defineModel<boolean>({ default: false })
defineProps<{ indeterminada?: boolean; deshabilitada?: boolean; descripcion?: string }>()
const id = useId()
</script>

<template>
  <label
    :for="id"
    :class="
      cn(
        'group inline-flex cursor-pointer items-start gap-2.5 text-sm select-none',
        deshabilitada && 'cursor-not-allowed opacity-60',
      )
    "
  >
    <span class="relative mt-0.5 flex">
      <input
        :id="id"
        v-model="marcada"
        type="checkbox"
        class="peer sr-only"
        :disabled="deshabilitada"
        :indeterminate="!!indeterminada"
      />
      <span
        :class="
          cn(
            'flex size-4 items-center justify-center rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-acento',
            marcada || indeterminada
              ? 'border-acento bg-acento text-sobre-acento'
              : 'border-borde-fuerte bg-superficie group-hover:border-acento',
          )
        "
      >
        <span v-if="indeterminada" class="h-0.5 w-2 rounded bg-current" />
        <Check v-else-if="marcada" class="size-3" :stroke-width="3" />
      </span>
    </span>
    <span v-if="$slots.default || descripcion" class="flex flex-col">
      <span v-if="$slots.default" class="leading-snug"><slot /></span>
      <span v-if="descripcion" class="text-[12.5px] text-tenue">{{ descripcion }}</span>
    </span>
  </label>
</template>

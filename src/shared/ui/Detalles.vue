<script setup lang="ts">
import { ChevronRight } from "@lucide/vue"
/** Información avanzada plegada: se muestra solo si el usuario la pide. */
defineProps<{ resumen: string }>()
</script>

<template>
  <details class="group rounded-lg border border-borde bg-superficie">
    <summary
      class="flex cursor-pointer list-none items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium text-suave select-none hover:text-texto [&::-webkit-details-marker]:hidden"
    >
      <ChevronRight class="size-4 transition-transform group-open:rotate-90" aria-hidden="true" />
      {{ resumen }}
    </summary>
    <div class="border-t border-borde px-3.5 py-3"><slot /></div>
  </details>
</template>

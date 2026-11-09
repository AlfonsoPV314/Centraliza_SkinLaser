<script setup lang="ts">
// Barra fija con el resumen de la selección múltiple y las acciones masivas (slot).
import { Casilla } from "@/shared/ui"

const p = defineProps<{ total: number; seleccionadas: number; ocupado?: boolean }>()
const emit = defineEmits<{ todas: [si: boolean] }>()
</script>

<template>
  <div
    class="sticky top-2 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-borde bg-superficie/95 px-4 py-2.5 text-[13.5px] shadow-panel backdrop-blur"
  >
    <Casilla
      :model-value="p.total > 0 && p.seleccionadas === p.total"
      :indeterminada="p.seleccionadas > 0 && p.seleccionadas < p.total"
      :deshabilitada="ocupado"
      @update:model-value="emit('todas', $event)"
    >
      <span class="font-medium" aria-live="polite">
        <template v-if="seleccionadas">{{ seleccionadas.toLocaleString("es-CL") }} de {{ total.toLocaleString("es-CL") }} seleccionadas</template>
        <template v-else>Seleccionar todas ({{ total.toLocaleString("es-CL") }})</template>
      </span>
    </Casilla>
    <div v-if="seleccionadas" class="ml-auto flex flex-wrap items-center gap-2"><slot /></div>
  </div>
</template>

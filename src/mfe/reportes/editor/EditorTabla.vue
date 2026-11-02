<script setup lang="ts">
import type { ColumnaCatalogo } from "@/domain/model"
import { Campo, SelectorMultiple } from "@/shared/ui"
import { opcionesDe, sinDerivados, type BloqueDe, type ErrorDe } from "./bloques"

const p = defineProps<{ b: BloqueDe<"tabla">; columnas: ColumnaCatalogo[]; error: ErrorDe }>()
const emit = defineEmits<{ cambiar: [b: BloqueDe<"tabla">] }>()
</script>

<template>
  <Campo etiqueta="Columnas" ayuda="Se muestran en el orden en que las elijas." :error="error('campos')">
    <SelectorMultiple
      :model-value="b.campos"
      :opciones="opcionesDe(sinDerivados(columnas))"
      marcador="Elegir columnas…"
      :invalido="!!error('campos')"
      @update:model-value="emit('cambiar', { ...p.b, campos: $event })"
    />
  </Campo>
</template>

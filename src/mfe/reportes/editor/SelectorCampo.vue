<script setup lang="ts">
import { computed } from "vue"
import type { ColumnaCatalogo } from "@/domain/model"
import { Selector } from "@/shared/ui"
import { grupoDe } from "./bloques"

const p = withDefaults(
  defineProps<{
    id?: string
    valor: string | undefined
    columnas: ColumnaCatalogo[]
    invalido?: boolean
    vacio?: string
  }>(),
  { vacio: "Elegir campo…" },
)
const emit = defineEmits<{ cambiar: [v: string] }>()
const grupos = computed(() => {
  const m = new Map<string, ColumnaCatalogo[]>()
  for (const c of p.columnas) m.set(grupoDe(c), [...(m.get(grupoDe(c)) ?? []), c])
  return [...m]
})
const desconocido = computed(() => !!p.valor && !p.columnas.some((c) => c.clave === p.valor))
</script>

<template>
  <Selector :id="id" :model-value="valor ?? ''" :invalido="invalido" @update:model-value="emit('cambiar', String($event ?? ''))">
    <option value="">{{ vacio }}</option>
    <option v-if="desconocido" :value="valor">{{ valor }} (no disponible)</option>
    <optgroup v-for="[g, cols] in grupos" :key="g" :label="g">
      <option v-for="c in cols" :key="c.clave" :value="c.clave">{{ c.etiqueta }}</option>
    </optgroup>
  </Selector>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { ColumnaCatalogo } from "@/domain/model"
import { SelectorBuscable, type OpcionBuscable } from "@/shared/ui"
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
// Agrupadas y ordenadas por grupo para que los encabezados no se repitan; la primera opción vacía permite quitar el campo.
const opciones = computed<OpcionBuscable[]>(() => {
  const m = new Map<string, ColumnaCatalogo[]>()
  for (const c of p.columnas) m.set(grupoDe(c), [...(m.get(grupoDe(c)) ?? []), c])
  return [
    { valor: "", etiqueta: p.vacio },
    ...[...m].flatMap(([g, cols]) => cols.map((c) => ({ valor: c.clave, etiqueta: c.etiqueta, grupo: g }))),
  ]
})
const noDisponible = (v: string) => `${v} (no disponible)`
</script>

<template>
  <SelectorBuscable
    :id="id"
    :model-value="valor ?? ''"
    :opciones="opciones"
    :placeholder="vacio"
    :invalido="invalido"
    :etiqueta-desconocida="noDisponible"
    @update:model-value="emit('cambiar', $event)"
  />
</template>

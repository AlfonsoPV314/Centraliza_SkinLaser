<script setup lang="ts">
import type { ColumnaCatalogo } from "@/domain/model"
import { describirFiltro, type Grupo } from "@/domain/filters"
import GrupoFiltro from "./GrupoFiltro.vue"

const grupo = defineModel<Grupo>({ required: true })
const p = defineProps<{ columnas: ColumnaCatalogo[] }>()
const etiqueta = (c: string) => p.columnas.find((x) => x.clave === c)?.etiqueta ?? c
</script>

<template>
  <div class="space-y-3">
    <GrupoFiltro v-model="grupo" :columnas="columnas" :nivel="0" />
    <p class="rounded-lg bg-superficie-2 px-3.5 py-2.5 text-[13px] text-suave" aria-live="polite">
      {{ describirFiltro(grupo, etiqueta) }}
    </p>
  </div>
</template>

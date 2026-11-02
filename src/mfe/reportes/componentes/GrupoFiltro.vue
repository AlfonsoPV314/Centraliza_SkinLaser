<script setup lang="ts">
import { FolderPlus, Plus, X } from "@lucide/vue"
import type { ColumnaCatalogo } from "@/domain/model"
import { OPERADORES_POR_TIPO, grupoVacio, nuevoId, type Condicion, type Grupo } from "@/domain/filters"
import { Boton, Segmentado, cn } from "@/shared/ui"
import CondicionFiltro from "./CondicionFiltro.vue"
import GrupoFiltro from "./GrupoFiltro.vue"
import { tipoDe } from "./filtros"

const grupo = defineModel<Grupo>({ required: true })
const p = defineProps<{ columnas: ColumnaCatalogo[]; nivel: number; quitable?: boolean }>()
const emit = defineEmits<{ quitar: [] }>()

const cambiar = (parcial: Partial<Grupo>) => (grupo.value = { ...grupo.value, ...parcial })
const fijarHijo = (i: number, h: Condicion | Grupo) =>
  cambiar({ hijos: grupo.value.hijos.map((x, j) => (j === i ? h : x)) })
const quitarHijo = (i: number) => cambiar({ hijos: grupo.value.hijos.filter((_, j) => j !== i) })
function agregarCondicion() {
  const campo = p.columnas[0]?.clave ?? "documento"
  cambiar({
    hijos: [
      ...grupo.value.hijos,
      { id: nuevoId(), tipo: "condicion", campo, operador: OPERADORES_POR_TIPO[tipoDe(p.columnas, campo)][0] },
    ],
  })
}
const agregarGrupo = () =>
  cambiar({ hijos: [...grupo.value.hijos, grupoVacio(grupo.value.union === "Y" ? "O" : "Y")] })
</script>

<template>
  <div :class="cn(nivel > 0 && 'rounded-xl border border-borde bg-superficie-2/60 p-3')">
    <div class="mb-2 flex flex-wrap items-center gap-2 text-[13px] text-suave">
      <span>{{ nivel === 0 ? "Incluir filas que cumplan" : "Que cumplan" }}</span>
      <Segmentado
        tamano="sm"
        etiqueta="Unión de condiciones"
        :model-value="grupo.union"
        :opciones="[
          { valor: 'Y', etiqueta: 'todas' },
          { valor: 'O', etiqueta: 'alguna' },
        ]"
        @update:model-value="cambiar({ union: $event })"
      />
      <span>de estas condiciones:</span>
      <Boton
        v-if="quitable"
        tamano="sm"
        variante="fantasma"
        solo-icono
        class="ml-auto"
        aria-label="Quitar grupo"
        :icono="X"
        @click="emit('quitar')"
      />
    </div>
    <div class="space-y-2">
      <template v-for="(h, i) in grupo.hijos" :key="h.id">
        <GrupoFiltro
          v-if="h.tipo === 'grupo'"
          :model-value="h"
          :columnas="columnas"
          :nivel="nivel + 1"
          quitable
          @update:model-value="fijarHijo(i, $event)"
          @quitar="quitarHijo(i)"
        />
        <CondicionFiltro
          v-else
          :model-value="h"
          :columnas="columnas"
          @update:model-value="fijarHijo(i, $event)"
          @quitar="quitarHijo(i)"
        />
      </template>
      <p v-if="!grupo.hijos.length" class="text-[12.5px] text-tenue">Sin condiciones.</p>
    </div>
    <div class="mt-2 flex flex-wrap gap-1">
      <Boton tamano="sm" variante="fantasma" :icono="Plus" @click="agregarCondicion">Condición</Boton>
      <Boton v-if="nivel < 2" tamano="sm" variante="fantasma" :icono="FolderPlus" @click="agregarGrupo">Grupo</Boton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { CalendarMinus, CalendarPlus } from "@lucide/vue"
import {
  bloqueTieneCriterios,
  bloqueVacio,
  describirRango,
  type BloqueRango,
  type RangoFechas,
} from "@/domain/ranges"
import { Boton, cn } from "@/shared/ui"
import BloquePeriodo from "./BloquePeriodo.vue"

const valor = defineModel<RangoFechas>({ required: true })
defineProps<{ anios: number[] }>()

const fijar = (i: number, b: BloqueRango) =>
  (valor.value = { bloques: valor.value.bloques.map((x, j) => (j === i ? b : x)) })
const quitar = (i: number) => (valor.value = { bloques: valor.value.bloques.filter((_, j) => j !== i) })
const agregar = (b: BloqueRango) => (valor.value = { bloques: [...valor.value.bloques, b] })
const primeraInclusion = computed(() => valor.value.bloques.find((b) => b.modo === "incluir")?.id)
const sinCriterio = computed(
  () => !valor.value.bloques.some((b) => b.modo === "incluir" && bloqueTieneCriterios(b)),
)
</script>

<template>
  <div class="space-y-3">
    <BloquePeriodo
      v-for="(b, i) in valor.bloques"
      :key="b.id"
      :b="b"
      :primero="b.modo === 'incluir' && primeraInclusion === b.id"
      :anios="anios"
      :quitable="valor.bloques.length > 1"
      @cambiar="fijar(i, $event)"
      @quitar="quitar(i)"
    />
    <div class="flex flex-wrap gap-2">
      <Boton tamano="sm" :icono="CalendarPlus" @click="agregar(bloqueVacio('incluir', 'O'))">Agregar período</Boton>
      <Boton tamano="sm" variante="fantasma" :icono="CalendarMinus" @click="agregar(bloqueVacio('excluir'))">
        Excluir fechas
      </Boton>
    </div>
    <p
      :class="
        cn('rounded-lg px-3.5 py-2.5 text-[13px]', sinCriterio ? 'bg-aviso-tenue text-aviso' : 'bg-superficie-2 text-suave')
      "
      aria-live="polite"
    >
      {{ describirRango(valor) }}
    </p>
  </div>
</template>

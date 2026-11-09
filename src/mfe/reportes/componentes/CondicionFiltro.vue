<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { X } from "@lucide/vue"
import { useServicios, useUsuario } from "@/application"
import type { ColumnaCatalogo } from "@/domain/model"
import { ETIQUETAS_OPERADOR, OPERADORES_POR_TIPO, type Condicion, type Operador } from "@/domain/filters"
import { Boton, Entrada, Selector, SelectorBuscable, SelectorMultiple } from "@/shared/ui"
import { tipoDe } from "./filtros"

const c = defineModel<Condicion>({ required: true })
const p = defineProps<{ columnas: ColumnaCatalogo[] }>()
const emit = defineEmits<{ quitar: [] }>()
const s = useServicios()
const { token } = useUsuario()

const tipo = computed(() => tipoDe(p.columnas, c.value.campo))
const operadores = computed(() => OPERADORES_POR_TIPO[tipo.value])
const tipoEntrada = computed(() => (tipo.value === "fecha" ? "date" : tipo.value === "hora" ? "time" : "text"))
const sinValor = computed(() => c.value.operador === "vacio" || c.value.operador === "no_vacio")
const opcionesCampo = computed(() => p.columnas.map((x) => ({ valor: x.clave, etiqueta: x.etiqueta })))

function cambiarCampo(campo: string) {
  const ops = OPERADORES_POR_TIPO[tipoDe(p.columnas, campo)]
  c.value = {
    id: c.value.id,
    tipo: "condicion",
    campo,
    operador: ops.includes(c.value.operador) ? c.value.operador : ops[0],
  }
}
const cambiar = (parcial: Partial<Condicion>) => (c.value = { ...c.value, ...parcial })

// Valores existentes del campo, para el operador «en la lista».
const opciones = ref<string[]>([])
watch(
  () => [c.value.operador, c.value.campo, token.value] as const,
  ([op, campo, t], _, alLimpiar) => {
    if (op !== "en_lista") return
    let vigente = true
    alLimpiar(() => (vigente = false))
    s.datos.valoresDistintos(t, campo).then(
      (v) => vigente && (opciones.value = v),
      () => vigente && (opciones.value = []),
    )
  },
  { immediate: true },
)
const opcionesLista = computed(() =>
  [...new Set([...opciones.value, ...(c.value.valores ?? [])])].map((v) => ({ valor: v, etiqueta: v })),
)
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <SelectorBuscable
      class="w-56"
      aria-label="Campo"
      :model-value="c.campo"
      :opciones="opcionesCampo"
      @update:model-value="cambiarCampo($event)"
    />
    <Selector
      class="w-40"
      aria-label="Operador"
      :model-value="c.operador"
      @update:model-value="cambiar({ operador: $event as Operador })"
    >
      <option v-for="o in operadores" :key="o" :value="o">{{ ETIQUETAS_OPERADOR[o] }}</option>
    </Selector>
    <SelectorMultiple
      v-if="c.operador === 'en_lista'"
      class="min-w-56 flex-1"
      :model-value="c.valores ?? []"
      :opciones="opcionesLista"
      permitir-libre
      marcador="Elegir valores…"
      @update:model-value="cambiar({ valores: $event })"
    />
    <template v-else-if="!sinValor">
      <Entrada
        class="w-40"
        :type="tipoEntrada"
        :inputmode="tipo === 'numero' || tipo === 'monto' ? 'decimal' : undefined"
        aria-label="Valor"
        placeholder="Valor"
        :model-value="c.valor ?? ''"
        @update:model-value="cambiar({ valor: String($event ?? '') })"
      />
      <template v-if="c.operador === 'entre'">
        <span class="text-[13px] text-tenue">y</span>
        <Entrada
          class="w-40"
          :type="tipoEntrada"
          aria-label="Hasta"
          placeholder="Hasta"
          :model-value="c.valor2 ?? ''"
          @update:model-value="cambiar({ valor2: String($event ?? '') })"
        />
      </template>
    </template>
    <Boton variante="fantasma" solo-icono aria-label="Quitar condición" :icono="X" @click="emit('quitar')" />
  </div>
</template>

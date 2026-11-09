<script setup lang="ts">
// Elige qué columnas se ven en la tabla de registros. Con buscador, sin distinguir tildes ni mayúsculas.
import { computed, ref } from "vue"
import { Search } from "@lucide/vue"
import { normalizarTexto } from "@/domain/text"
import { Boton, Casilla, Dialogo, Entrada } from "@/shared/ui"
import type { ColumnaVisible } from "./columnasTabla"


const p = defineProps<{ abierto: boolean; columnas: ColumnaVisible[]; predeterminadas: string[] }>()
const visibles = defineModel<string[]>({ required: true })
const emit = defineEmits<{ cerrar: [] }>()
const q = ref("")
const filtradas = computed(() => {
  const n = normalizarTexto(q.value).trim()
  return n ? p.columnas.filter((c) => normalizarTexto(`${c.etiqueta} ${c.detalle ?? ""}`).includes(n)) : p.columnas
})
function alternar(clave: string, marcar: boolean) {
  // Conserva el orden del catálogo para que la tabla no cambie de orden al marcar.
  const set = new Set(visibles.value)
  if (marcar) set.add(clave)
  else set.delete(clave)
  visibles.value = p.columnas.map((c) => c.clave).filter((c) => set.has(c))
}
const marcarFiltradas = (marcar: boolean) => {
  const set = new Set(visibles.value)
  for (const c of filtradas.value) marcar ? set.add(c.clave) : set.delete(c.clave)
  visibles.value = p.columnas.map((c) => c.clave).filter((c) => set.has(c))
}
</script>

<template>
  <Dialogo :abierto="abierto" titulo="Columnas visibles" descripcion="Elija qué columnas mostrar en la tabla. Se recuerda en este navegador." @cerrar="emit('cerrar')">
    <Entrada v-model="q" :prefijo="Search" placeholder="Buscar columna" aria-label="Buscar columna" />
    <div class="mt-2 flex flex-wrap items-center gap-1 text-[12.5px] text-tenue">
      <span class="mr-auto">{{ visibles.length }} de {{ columnas.length }} visibles</span>
      <Boton tamano="sm" variante="fantasma" @click="marcarFiltradas(true)">Marcar {{ q ? "resultados" : "todas" }}</Boton>
      <Boton tamano="sm" variante="fantasma" @click="marcarFiltradas(false)">Desmarcar {{ q ? "resultados" : "todas" }}</Boton>
      <Boton tamano="sm" variante="fantasma" @click="visibles = [...predeterminadas]">Restablecer</Boton>
    </div>
    <ul class="mt-2 max-h-[50vh] space-y-0.5 overflow-y-auto rounded-lg border border-borde p-1.5">
      <li v-for="c in filtradas" :key="c.clave" class="rounded-md px-2 py-1.5 hover:bg-superficie-2">
        <Casilla :model-value="visibles.includes(c.clave)" @update:model-value="alternar(c.clave, $event)">
          {{ c.etiqueta }}
          <span v-if="c.detalle" class="ml-1 text-[12px] text-tenue">{{ c.detalle }}</span>
        </Casilla>
      </li>
      <li v-if="!filtradas.length" class="px-2 py-4 text-center text-[13px] text-tenue">Ninguna columna coincide.</li>
    </ul>
    <template #pie>
      <Boton variante="primario" @click="emit('cerrar')">Listo</Boton>
    </template>
  </Dialogo>
</template>

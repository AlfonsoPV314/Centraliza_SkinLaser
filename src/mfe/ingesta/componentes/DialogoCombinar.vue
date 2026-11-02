<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { Combine } from "@lucide/vue"
import type { CombinacionCeldas } from "@/contracts"
import type { ColumnaCatalogo, FilaGuardada, FilaProcesada } from "@/domain/model"
import { camposComparables, combinarFilas, ladoSugerido } from "@/domain/merge"
import { tieneErrores } from "@/domain/rules"
import { Aviso, Boton, Dialogo } from "@/shared/ui"
import { etiquetaDe, tiposExtraDe } from "../valores"
import ComparacionDuplicado from "./ComparacionDuplicado.vue"

const p = defineProps<{
  abierto: boolean
  anterior: FilaGuardada | FilaProcesada | null
  nueva: FilaProcesada | null
  catalogo: ColumnaCatalogo[] | null
  etiquetaAnterior: string
  etiquetaNueva: string
  inicial?: CombinacionCeldas
}>()
const emit = defineEmits<{
  cerrar: []
  aplicar: [r: { fila: FilaProcesada; combinacion: CombinacionCeldas }]
}>()

const elecciones = ref<CombinacionCeldas>({})
watch(
  () => p.abierto,
  (a) => a && (elecciones.value = { ...(p.inicial ?? {}) }),
  { immediate: true },
)

/** Combinación completa (incluye los lados sugeridos que el usuario no tocó) y su validación. */
const resultado = computed(() => {
  if (!p.anterior || !p.nueva) return null
  const combinacion: CombinacionCeldas = {}
  for (const c of camposComparables(p.anterior, p.nueva))
    combinacion[c] = elecciones.value[c] ?? ladoSugerido(p.anterior, p.nueva, c)
  const fila = combinarFilas(p.anterior, p.nueva, combinacion, tiposExtraDe(p.catalogo))
  return { fila, combinacion }
})
const errores = computed(
  () => resultado.value?.fila.problemas.filter((x) => x.severidad === "error") ?? [],
)
</script>

<template>
  <Dialogo
    :abierto="abierto"
    ancho="xl"
    titulo="Combinar las dos versiones"
    descripcion="Elija, celda por celda, qué valor conservar. La fila resultante se vuelve a validar antes de guardarse."
    @cerrar="emit('cerrar')"
  >
    <div v-if="anterior && nueva" class="-mx-5 -mt-4 border-b border-borde">
      <ComparacionDuplicado
        v-model="elecciones"
        :anterior="anterior"
        :nueva="nueva"
        :catalogo="catalogo"
        :etiqueta-anterior="etiquetaAnterior"
        :etiqueta-nueva="etiquetaNueva"
        combinando
      />
    </div>
    <Aviso v-if="errores.length" tono="peligro" class="mt-4" titulo="La combinación tiene errores">
      <ul class="mt-1 space-y-0.5">
        <li v-for="(x, i) in errores" :key="i">{{ etiquetaDe(x.campo, catalogo) }}: {{ x.mensaje }}</li>
      </ul>
    </Aviso>
    <template #pie>
      <Boton @click="emit('cerrar')">Cancelar</Boton>
      <Boton
        variante="primario"
        :icono="Combine"
        :disabled="!resultado || tieneErrores(resultado.fila)"
        @click="resultado && emit('aplicar', resultado)"
      >
        Usar la combinación
      </Boton>
    </template>
  </Dialogo>
</template>

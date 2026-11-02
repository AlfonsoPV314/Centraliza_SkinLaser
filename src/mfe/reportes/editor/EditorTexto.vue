<script setup lang="ts">
import type { ColumnaCatalogo } from "@/domain/model"
import { MARCADORES } from "@/domain/prose"
import { AreaTexto, Campo } from "@/shared/ui"
import { sinDerivados, type BloqueDe, type ErrorDe } from "./bloques"
import SelectorCampo from "./SelectorCampo.vue"

type B = BloqueDe<"texto">
const p = defineProps<{ b: B; columnas: ColumnaCatalogo[]; error: ErrorDe }>()
const emit = defineEmits<{ cambiar: [b: B] }>()
const idTexto = `${p.b.id}-texto`
const marcador = (clave: string) => `{${clave}}`

function insertar(clave: string) {
  const el = document.getElementById(idTexto) as HTMLTextAreaElement | null
  const marca = marcador(clave)
  const ini = el?.selectionStart ?? p.b.texto.length
  const fin = el?.selectionEnd ?? p.b.texto.length
  emit("cambiar", { ...p.b, texto: p.b.texto.slice(0, ini) + marca + p.b.texto.slice(fin) })
  requestAnimationFrame(() => {
    el?.focus()
    el?.setSelectionRange(ini + marca.length, ini + marca.length)
  })
}
</script>

<template>
  <div class="space-y-4">
    <Campo
      etiqueta="Campo descrito"
      :html-for="`${b.id}-campo`"
      ayuda="Las medidas del texto ({promedio}, {suma}…) se calculan sobre este campo."
      :error="error('campo')"
      class="sm:max-w-sm"
    >
      <SelectorCampo
        :id="`${b.id}-campo`"
        :valor="b.campo"
        :columnas="sinDerivados(columnas)"
        :invalido="!!error('campo')"
        @cambiar="emit('cambiar', { ...p.b, campo: $event })"
      />
    </Campo>
    <Campo etiqueta="Texto" :html-for="idTexto" :error="error('texto')">
      <AreaTexto
        :id="idTexto"
        :rows="5"
        :model-value="b.texto"
        :invalido="!!error('texto')"
        @update:model-value="emit('cambiar', { ...p.b, texto: $event ?? '' })"
      />
    </Campo>
    <div>
      <p class="mb-1.5 text-[12px] font-medium text-tenue">Insertar dato</p>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="m in MARCADORES"
          :key="m.clave"
          type="button"
          :title="m.descripcion"
          class="num rounded-md bg-superficie-2 px-2 py-0.5 text-[12.5px] text-suave hover:bg-superficie-3 hover:text-texto"
          @click="insertar(m.clave)"
        >
          {{ marcador(m.clave) }}
        </button>
      </div>
    </div>
  </div>
</template>

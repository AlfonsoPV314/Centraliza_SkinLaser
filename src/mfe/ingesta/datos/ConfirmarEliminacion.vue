<script setup lang="ts">
// Confirmación fuerte para borrados permanentes: exige escribir una palabra y explica que no hay vuelta atrás.
import { ref, watch } from "vue"
import { TriangleAlert } from "@lucide/vue"
import { Boton, Dialogo, Entrada } from "@/shared/ui"

const p = defineProps<{ abierto: boolean; titulo: string; eliminando: boolean; accion?: string }>()
const emit = defineEmits<{ cerrar: []; confirmar: [] }>()
const PALABRA = "ELIMINAR"
const texto = ref("")
watch(
  () => p.abierto,
  (a) => a && (texto.value = ""),
)
const valido = () => texto.value.trim().toUpperCase() === PALABRA
</script>

<template>
  <Dialogo :abierto="abierto" ancho="sm" :titulo="titulo" @cerrar="!eliminando && emit('cerrar')">
    <div class="space-y-4">
      <div class="flex gap-3 rounded-lg border border-peligro/30 bg-peligro-tenue px-3.5 py-3 text-[13.5px]">
        <TriangleAlert class="mt-0.5 size-4 shrink-0 text-peligro" aria-hidden="true" />
        <div class="space-y-1">
          <p class="font-semibold text-peligro">Esta acción es permanente y no se puede deshacer.</p>
          <p class="text-suave">
            Los datos eliminados <strong>no se pueden recuperar</strong>: no quedan en el historial de cargas ni en
            ninguna papelera. Para volver a tenerlos tendrá que importar otra vez la planilla original.
          </p>
        </div>
      </div>
      <div class="text-[13.5px] text-suave"><slot /></div>
      <form @submit.prevent="valido() && emit('confirmar')">
        <label class="block text-[13px]">
          Para confirmar, escriba <strong class="font-mono tracking-wide">{{ PALABRA }}</strong>
          <Entrada v-model="texto" class="mt-1.5" autocomplete="off" spellcheck="false" :disabled="eliminando" />
        </label>
      </form>
    </div>
    <template #pie>
      <Boton :disabled="eliminando" @click="emit('cerrar')">Cancelar</Boton>
      <Boton variante="peligro" :cargando="eliminando" :disabled="!valido()" @click="emit('confirmar')">
        {{ accion ?? "Eliminar definitivamente" }}
      </Boton>
    </template>
  </Dialogo>
</template>

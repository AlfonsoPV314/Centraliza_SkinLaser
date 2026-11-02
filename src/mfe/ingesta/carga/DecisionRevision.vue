<script setup lang="ts">
import { computed } from "vue"
import { ArrowLeft, CheckCircle2, ClipboardCheck, Clock3, Copy, FileWarning, Rows3 } from "@lucide/vue"
import { Boton, Dato } from "@/shared/ui"
import type { Lote } from "./preparar"

/** Paso intermedio: con errores o duplicados, el usuario elige revisarlos ahora o importar y revisarlos después. */
const p = defineProps<{ lote: Lote; hojas: number; guardando: boolean }>()
const emit = defineEmits<{ revisar: []; importarDespues: []; volver: [] }>()

const f = (n: number) => n.toLocaleString("es-CL")
const listas = computed(() => p.lote.validas.length - p.lote.duplicados.length)
const pendientes = computed(() => p.lote.conError.length + p.lote.duplicados.length)
</script>

<template>
  <div class="animar-aparecer space-y-5">
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Dato
        etiqueta="Filas leídas"
        :valor="f(lote.validas.length + lote.conError.length)"
        :detalle="`${hojas} ${hojas === 1 ? 'hoja' : 'hojas'}`"
        :icono="Rows3"
      />
      <Dato etiqueta="Listas para guardar" :valor="f(listas)" tono="exito" :icono="CheckCircle2" />
      <Dato
        etiqueta="Con errores"
        :valor="f(lote.conError.length)"
        :tono="lote.conError.length ? 'peligro' : undefined"
        :icono="FileWarning"
      />
      <Dato
        etiqueta="Posibles duplicados"
        :valor="f(lote.duplicados.length)"
        :tono="lote.duplicados.length ? 'aviso' : undefined"
        :icono="Copy"
      />
    </div>

    <div v-if="pendientes" role="group" aria-labelledby="titulo-decision">
      <h2 id="titulo-decision" class="mb-1 text-[16px] font-semibold tracking-tight">
        ¿Cuándo quiere revisar {{ pendientes === 1 ? "la fila pendiente" : `las ${f(pendientes)} filas pendientes` }}?
      </h2>
      <p class="mb-4 text-[13.5px] text-suave">
        Las {{ f(listas) }} filas listas se guardan en ambos casos.
      </p>
      <div class="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          class="group flex flex-col items-start gap-2 rounded-xl border-2 border-acento bg-acento-tenue/40 p-5 text-left transition-colors hover:bg-acento-tenue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento disabled:opacity-60"
          :disabled="guardando"
          @click="emit('revisar')"
        >
          <span class="flex size-9 items-center justify-center rounded-lg bg-acento text-sobre-acento">
            <ClipboardCheck class="size-4" aria-hidden="true" />
          </span>
          <span class="text-[15px] font-semibold">Revisar ahora</span>
          <span class="text-[13px] text-suave">
            Corrija los errores aquí mismo y decida qué hacer con cada duplicado, incluso combinando
            celdas, antes de guardar.
          </span>
          <span class="mt-1 text-[12px] font-medium text-acento">Recomendado</span>
        </button>
        <button
          type="button"
          class="flex flex-col items-start gap-2 rounded-xl border-2 border-borde-fuerte bg-superficie p-5 text-left transition-colors hover:bg-superficie-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento disabled:opacity-60"
          :disabled="guardando"
          @click="emit('importarDespues')"
        >
          <span class="flex size-9 items-center justify-center rounded-lg bg-superficie-3 text-suave">
            <Clock3 class="size-4" aria-hidden="true" />
          </span>
          <span class="text-[15px] font-semibold">
            {{ guardando ? "Guardando…" : "Importar y revisar después" }}
          </span>
          <span class="text-[13px] text-suave">
            Se guarda lo que está listo. Los errores y duplicados quedan en Datos para resolverlos
            cuando pueda; no se pierde nada.
          </span>
        </button>
      </div>
    </div>

    <Boton :icono="ArrowLeft" :disabled="guardando" @click="emit('volver')">Volver a las hojas</Boton>
  </div>
</template>

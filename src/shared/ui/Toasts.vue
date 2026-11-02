<script setup lang="ts">
import { CheckCircle2, Info, OctagonAlert, X } from "@lucide/vue"
import { quitarToast, toasts } from "@/application/notificar"

const ICONO = { exito: CheckCircle2, peligro: OctagonAlert, info: Info }
const COLOR = { exito: "text-exito", peligro: "text-peligro", info: "text-info" }
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
    >
      <div
        v-for="t in toasts"
        :key="t.id"
        class="animar-deslizar pointer-events-auto flex items-start gap-3 rounded-xl border border-borde bg-superficie p-3.5 shadow-2xl"
      >
        <component :is="ICONO[t.tono]" :class="['mt-0.5 size-4 shrink-0', COLOR[t.tono]]" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium">{{ t.titulo }}</p>
          <p v-if="t.detalle" class="mt-0.5 text-[13px] text-suave">{{ t.detalle }}</p>
        </div>
        <button
          v-if="t.accion"
          type="button"
          class="shrink-0 rounded-md px-2 py-1 text-[13px] font-semibold text-acento hover:bg-acento-tenue"
          @click="(t.accion.alHacer(), quitarToast(t.id))"
        >
          {{ t.accion.etiqueta }}
        </button>
        <button
          type="button"
          class="shrink-0 text-tenue hover:text-texto"
          aria-label="Cerrar aviso"
          @click="quitarToast(t.id)"
        >
          <X class="size-4" />
        </button>
      </div>
    </div>
  </Teleport>
</template>

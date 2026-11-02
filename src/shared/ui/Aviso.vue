<script setup lang="ts">
import { computed } from "vue"
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "@lucide/vue"
import { cn } from "./cn"
import { TONOS } from "./tonos"

const p = withDefaults(
  defineProps<{ tono?: "info" | "aviso" | "peligro" | "exito"; titulo?: string }>(),
  { tono: "info" },
)
const Icono = computed(
  () => ({ info: Info, aviso: AlertTriangle, peligro: OctagonAlert, exito: CheckCircle2 })[p.tono],
)
const borde = computed(
  () =>
    ({
      info: "border-info/25",
      aviso: "border-aviso/30",
      peligro: "border-peligro/30",
      exito: "border-exito/30",
    })[p.tono],
)
</script>

<template>
  <div
    :role="tono === 'peligro' ? 'alert' : 'status'"
    :class="cn('flex gap-3 rounded-lg border px-3.5 py-3 text-[13.5px]', TONOS[tono], borde)"
  >
    <component :is="Icono" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <div class="min-w-0 flex-1 text-texto">
      <p v-if="titulo" class="font-medium">{{ titulo }}</p>
      <div v-if="$slots.default" :class="cn('text-suave', titulo && 'mt-0.5')"><slot /></div>
    </div>
    <div v-if="$slots.accion" class="shrink-0 self-center"><slot name="accion" /></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue"
import type { ECharts, EChartsOption } from "echarts"

/** Envoltorio de ECharts: carga la librería bajo demanda y se ajusta al tamaño del contenedor. */
const p = withDefaults(defineProps<{ opcion: EChartsOption; alto?: number; etiqueta: string }>(), {
  alto: 280,
})
const el = ref<HTMLDivElement>()
let instancia: ECharts | null = null
let observador: ResizeObserver | null = null
let vivo = true

onMounted(async () => {
  const echarts = await import("echarts")
  if (!vivo || !el.value) return
  instancia = echarts.init(el.value, undefined, { renderer: "canvas" })
  instancia.setOption(p.opcion, true)
  observador = new ResizeObserver(() => instancia?.resize())
  observador.observe(el.value)
})
watch(
  () => p.opcion,
  (o) => instancia?.setOption(o, true),
)
onBeforeUnmount(() => {
  vivo = false
  observador?.disconnect()
  instancia?.dispose()
  instancia = null
})
</script>

<template>
  <div ref="el" role="img" :aria-label="etiqueta" class="w-full" :style="{ height: `${alto}px` }" />
</template>

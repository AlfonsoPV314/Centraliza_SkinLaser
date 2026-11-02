<script setup lang="ts">
import { computed } from "vue"
import type { ColumnaCatalogo } from "@/domain/model"
import {
  ETIQUETAS_GRAFICO,
  REQUISITOS_GRAFICO,
  cambiarTipoGrafico,
  esNumerico,
  type Agregacion,
  type TipoGrafico,
} from "@/domain/templates"
import { Campo, Segmentado, cn } from "@/shared/ui"
import { ICONOS_GRAFICO, type BloqueDe, type ErrorDe } from "./bloques"
import SelectorCampo from "./SelectorCampo.vue"

type B = BloqueDe<"grafico">
const p = defineProps<{ b: B; columnas: ColumnaCatalogo[]; error: ErrorDe }>()
const emit = defineEmits<{ cambiar: [b: B] }>()

const TIPOS = Object.keys(ETIQUETAS_GRAFICO) as TipoGrafico[]
const r = computed(() => REQUISITOS_GRAFICO[p.b.grafico])
const numericas = computed(() => p.columnas.filter((c) => esNumerico(c.tipo) && !c.clave.startsWith("__")))
const categoricas = computed(() => p.columnas.filter((c) => c.tipo !== "monto"))
const temporal = computed(() => ["lineas", "tendencia", "areas"].includes(p.b.grafico))
const id = (c: string) => `${p.b.id}-${c}`
const cambiar = (parcial: Partial<B>) => emit("cambiar", { ...p.b, ...parcial })
const fijarAgregacion = (agregacion: Agregacion) =>
  cambiar({
    agregacion,
    campoY: agregacion === "conteo" ? undefined : (p.b.campoY ?? numericas.value[0]?.clave),
  })
const etiquetaX = computed(() =>
  r.value.x === "numero" ? "Valor a distribuir" : temporal.value ? "Eje de tiempo" : "Agrupar por",
)
</script>

<template>
  <div class="space-y-4">
    <div>
      <p :id="id('tipo')" class="mb-2 text-[13px] font-medium">Tipo de gráfico</p>
      <div class="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-6" role="radiogroup" :aria-labelledby="id('tipo')">
        <button
          v-for="t in TIPOS"
          :key="t"
          type="button"
          role="radio"
          :aria-checked="b.grafico === t"
          :title="ETIQUETAS_GRAFICO[t].ayuda"
          :class="
            cn(
              'flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-[12px] transition-colors',
              b.grafico === t
                ? 'border-acento bg-acento-tenue font-medium text-acento'
                : 'border-borde text-suave hover:border-borde-fuerte hover:text-texto',
            )
          "
          @click="emit('cambiar', cambiarTipoGrafico(b, t))"
        >
          <component :is="ICONOS_GRAFICO[t]" class="size-4.5" :stroke-width="1.75" aria-hidden="true" />
          {{ ETIQUETAS_GRAFICO[t].nombre }}
        </button>
      </div>
      <p class="mt-2 text-[12.5px] text-tenue">{{ ETIQUETAS_GRAFICO[b.grafico].ayuda }}</p>
    </div>

    <p v-if="b.grafico === 'heatmap'" class="rounded-lg bg-superficie-2 px-3.5 py-2.5 text-[13px] text-suave">
      Cuenta filas por día de la semana y hora, tomados del campo de fecha de la plantilla. Las filas sin hora no se
      incluyen.
    </p>
    <div v-else class="grid gap-4 sm:grid-cols-2">
      <Campo
        v-if="r.x"
        :etiqueta="etiquetaX"
        :html-for="id('x')"
        :error="error('campoX')"
        :ayuda="temporal && !error('campoX') ? 'Usa Mes, Trimestre o Año para ver la evolución.' : undefined"
      >
        <SelectorCampo
          :id="id('x')"
          :valor="b.campoX"
          :columnas="r.x === 'numero' ? numericas : categoricas"
          :invalido="!!error('campoX')"
          @cambiar="cambiar({ campoX: $event })"
        />
      </Campo>
      <Campo v-if="r.y === 'agregacion'" etiqueta="Medir">
        <Segmentado
          etiqueta="Agregación"
          :model-value="b.agregacion"
          :opciones="[
            { valor: 'conteo', etiqueta: 'Cantidad' },
            { valor: 'suma', etiqueta: 'Suma' },
            { valor: 'promedio', etiqueta: 'Promedio' },
          ]"
          @update:model-value="fijarAgregacion"
        />
      </Campo>
      <Campo
        v-if="r.y === 'numero' || (r.y === 'agregacion' && b.agregacion !== 'conteo')"
        :etiqueta="r.y === 'numero' ? 'Valor numérico' : b.agregacion === 'suma' ? 'Sumar' : 'Promediar'"
        :html-for="id('y')"
        :error="error('campoY')"
      >
        <SelectorCampo
          :id="id('y')"
          :valor="b.campoY"
          :columnas="numericas"
          :invalido="!!error('campoY')"
          @cambiar="cambiar({ campoY: $event || undefined })"
        />
      </Campo>
      <Campo v-if="r.serie" etiqueta="Desglosar por" :html-for="id('serie')" :error="error('campoSerie')">
        <SelectorCampo
          :id="id('serie')"
          :valor="b.campoSerie"
          :columnas="categoricas.filter((c) => !c.clave.startsWith('__') || c.clave === b.campoSerie)"
          :invalido="!!error('campoSerie')"
          @cambiar="cambiar({ campoSerie: $event || undefined })"
        />
      </Campo>
    </div>
  </div>
</template>

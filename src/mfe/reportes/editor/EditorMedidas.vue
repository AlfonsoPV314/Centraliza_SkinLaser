<script setup lang="ts">
import { computed } from "vue"
import type { ColumnaCatalogo } from "@/domain/model"
import { ETIQUETAS_MEDIDA, MEDIDAS_NUMERICAS, TODAS_LAS_MEDIDAS, type Medida } from "@/domain/stats"
import { esNumerico } from "@/domain/templates"
import { Campo, cn } from "@/shared/ui"
import { sinDerivados, type BloqueDe, type ErrorDe } from "./bloques"
import SelectorCampo from "./SelectorCampo.vue"

type B = BloqueDe<"medidas">
const p = defineProps<{ b: B; columnas: ColumnaCatalogo[]; error: ErrorDe }>()
const emit = defineEmits<{ cambiar: [b: B] }>()

const soloNumericas = (m: Medida) => MEDIDAS_NUMERICAS.includes(m) || m === "variacion"
const tipo = computed(() => p.columnas.find((c) => c.clave === p.b.campo)?.tipo)
const numerico = computed(() => esNumerico(tipo.value))
const disponibles = computed(() =>
  numerico.value ? TODAS_LAS_MEDIDAS : TODAS_LAS_MEDIDAS.filter((m) => !soloNumericas(m)),
)
function cambiarCampo(campo: string) {
  const t = p.columnas.find((c) => c.clave === campo)?.tipo
  const medidas = esNumerico(t) ? p.b.medidas : p.b.medidas.filter((m) => !soloNumericas(m))
  emit("cambiar", { ...p.b, campo, medidas: medidas.length ? medidas : ["conteo"] })
}
const alternar = (m: Medida) =>
  emit("cambiar", {
    ...p.b,
    medidas: p.b.medidas.includes(m)
      ? p.b.medidas.filter((x) => x !== m)
      : TODAS_LAS_MEDIDAS.filter((x) => x === m || p.b.medidas.includes(x)),
  })
</script>

<template>
  <div class="space-y-4">
    <Campo etiqueta="Campo a resumir" :html-for="`${b.id}-campo`" :error="error('campo')" class="sm:max-w-xs">
      <SelectorCampo
        :id="`${b.id}-campo`"
        :valor="b.campo"
        :columnas="sinDerivados(columnas)"
        :invalido="!!error('campo')"
        @cambiar="cambiarCampo"
      />
    </Campo>
    <Campo
      etiqueta="Medidas"
      :error="error('medidas')"
      :ayuda="
        !numerico && tipo ? 'Este campo no es numérico: solo aplican conteo, moda y porcentaje con dato.' : undefined
      "
    >
      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Medidas">
        <button
          v-for="m in disponibles"
          :key="m"
          type="button"
          :aria-pressed="b.medidas.includes(m)"
          :class="
            cn(
              'rounded-md border px-2.5 py-1 text-[13px] transition-colors',
              b.medidas.includes(m)
                ? 'border-acento bg-acento-tenue font-medium text-acento'
                : 'border-borde text-suave hover:border-borde-fuerte hover:text-texto',
            )
          "
          @click="alternar(m)"
        >
          {{ ETIQUETAS_MEDIDA[m] }}
        </button>
      </div>
    </Campo>
  </div>
</template>

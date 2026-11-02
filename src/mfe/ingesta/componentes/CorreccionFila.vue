<script setup lang="ts">
import { computed, ref, shallowRef, useId } from "vue"
import { AlertTriangle, Trash2 } from "@lucide/vue"
import type { ColumnaCatalogo, FilaProcesada } from "@/domain/model"
import { procesarFila, tieneErrores } from "@/domain/rules"
import { Boton, Campo, Casilla, Entrada, Insignia, Tarjeta, cn } from "@/shared/ui"
import { crudoATexto, etiquetaDe, tiposExtraDe } from "../valores"

/** Corrige una fila con errores: edita solo los campos con problemas y la vuelve a validar completa. */
const p = withDefaults(
  defineProps<{
    fila: FilaProcesada
    catalogo: ColumnaCatalogo[] | null
    /** Texto adicional para el origen (por ejemplo, cuándo se cargó). */
    contexto?: string
    ocupado?: "guardar" | "descartar" | null
    etiquetaGuardar?: string
    etiquetaDescartar?: string
  }>(),
  { ocupado: null, etiquetaGuardar: "Revisar y guardar", etiquetaDescartar: "Descartar fila" },
)
const emit = defineEmits<{ guardar: [fila: FilaProcesada]; descartar: [] }>()

const id = useId()
const original = p.fila
const actual = shallowRef<FilaProcesada>(original)
const camposEditables = [...new Set(original.problemas.map((x) => x.campo))]
const valores = ref<Record<string, string>>(
  Object.fromEntries(camposEditables.map((c) => [c, crudoATexto(original.crudos[c])])),
)
const pasaporte = ref(!!original.forzarPasaporte)
const errores = computed(() => actual.value.problemas.filter((x) => x.severidad === "error"))
const advertencias = computed(() =>
  actual.value.problemas.filter((x) => x.severidad === "advertencia"),
)
const problemaDoc = original.problemas.some(
  (x) => x.campo === "documento" && x.severidad === "error",
)

function revisar() {
  const nueva = procesarFila(
    { ...original.crudos, ...valores.value },
    {
      uid: original.uid,
      archivo: original.archivo,
      hoja: original.hoja,
      numero: original.numero,
      tipoPlanilla: original.tipoPlanilla,
      tiposExtra: tiposExtraDe(p.catalogo),
      forzarPasaporte: pasaporte.value || undefined,
    },
  )
  actual.value = nueva
  if (!tieneErrores(nueva)) emit("guardar", nueva)
}
</script>

<template>
  <Tarjeta>
    <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="truncate text-[14.5px] font-semibold">{{ original.archivo }}</p>
        <p class="text-[12.5px] text-tenue">
          <template v-if="original.hoja">Hoja «{{ original.hoja }}» · </template>
          Fila {{ original.numero }} ·
          {{ original.tipoPlanilla === "pagos" ? "Pagos" : "Pacientes" }}
          <template v-if="contexto"> · {{ contexto }}</template>
        </p>
      </div>
      <Insignia v-if="errores.length" tono="peligro">
        {{ errores.length === 1 ? "1 error" : `${errores.length} errores` }}
      </Insignia>
      <Insignia v-else tono="exito">Sin errores</Insignia>
    </div>

    <ul class="mb-4 space-y-1.5" aria-live="polite">
      <li
        v-for="(x, i) in actual.problemas"
        :key="`${x.regla}-${i}`"
        class="flex gap-2 text-[13px]"
      >
        <AlertTriangle
          :class="cn('mt-0.5 size-3.5 shrink-0', x.severidad === 'error' ? 'text-peligro' : 'text-aviso')"
          aria-hidden="true"
        />
        <span>
          <span class="font-medium">{{ etiquetaDe(x.campo, catalogo) }}:</span>
          {{ x.mensaje }}
        </span>
      </li>
      <li v-if="!actual.problemas.length" class="text-[13px] text-exito">Todo correcto.</li>
    </ul>

    <div class="grid gap-3 sm:grid-cols-2">
      <Campo
        v-for="c in camposEditables"
        :key="c"
        :etiqueta="etiquetaDe(c, catalogo)"
        :html-for="`${id}-${c}`"
      >
        <Entrada
          :id="`${id}-${c}`"
          v-model="valores[c]"
          :invalido="errores.some((x) => x.campo === c)"
          @keydown.enter.prevent="revisar"
        />
      </Campo>
    </div>

    <Casilla
      v-if="problemaDoc"
      v-model="pasaporte"
      class="mt-3"
      descripcion="Márquelo si el documento no es un RUN chileno."
    >
      Es un pasaporte extranjero
    </Casilla>
    <p v-if="advertencias.length && !errores.length" class="mt-3 text-[12.5px] text-tenue">
      Las advertencias no impiden guardar.
    </p>

    <div class="mt-4 flex flex-wrap justify-end gap-2 border-t border-borde pt-4">
      <Boton
        variante="fantasma"
        :icono="Trash2"
        :cargando="ocupado === 'descartar'"
        :disabled="!!ocupado"
        @click="emit('descartar')"
      >
        {{ etiquetaDescartar }}
      </Boton>
      <Boton
        variante="primario"
        :cargando="ocupado === 'guardar'"
        :disabled="!!ocupado"
        @click="revisar"
      >
        {{ etiquetaGuardar }}
      </Boton>
    </div>
  </Tarjeta>
</template>

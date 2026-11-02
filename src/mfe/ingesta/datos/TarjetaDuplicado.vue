<script setup lang="ts">
import { computed, ref } from "vue"
import { Combine } from "@lucide/vue"
import { useInformarError, useServicios, useUsuario, useNotificar } from "@/application"
import type { AccionDuplicado, CombinacionCeldas, DuplicadoPendiente } from "@/contracts"
import { formatearFecha } from "@/domain/dates"
import type { ColumnaCatalogo } from "@/domain/model"
import { camposComparables, combinarFilas, ladoSugerido } from "@/domain/merge"
import { Boton, Insignia, Tarjeta } from "@/shared/ui"
import ComparacionDuplicado from "../componentes/ComparacionDuplicado.vue"
import { etiquetaDe, nombreDeFila, tiposExtraDe } from "../valores"

const p = defineProps<{ dup: DuplicadoPendiente; catalogo: ColumnaCatalogo[] | null }>()
const emit = defineEmits<{ resuelto: [] }>()
const s = useServicios()
const { token } = useUsuario()
const notificar = useNotificar()
const informar = useInformarError()
const ocupado = ref<string | null>(null)
const combinando = ref(false)
const elecciones = ref<CombinacionCeldas>({})

const valor = (f: DuplicadoPendiente["nueva"] | DuplicadoPendiente["existente"], c: string) =>
  f.campos[c]?.n ?? f.campos[c]?.o ?? ""
const diferencias = computed(
  () =>
    camposComparables(p.dup.existente, p.dup.nueva).filter(
      (c) => valor(p.dup.existente, c) !== valor(p.dup.nueva, c),
    ).length,
)
const combinada = computed(() => {
  if (!combinando.value) return null
  const combinacion: CombinacionCeldas = {}
  for (const c of camposComparables(p.dup.existente, p.dup.nueva))
    combinacion[c] = elecciones.value[c] ?? ladoSugerido(p.dup.existente, p.dup.nueva, c)
  return {
    fila: combinarFilas(p.dup.existente, p.dup.nueva, combinacion, tiposExtraDe(p.catalogo)),
    combinacion,
  }
})
const erroresCombinada = computed(
  () => combinada.value?.fila.problemas.filter((x) => x.severidad === "error") ?? [],
)
const TITULOS: Record<Exclude<AccionDuplicado, "decidir_despues">, string> = {
  conservar_anterior: "Se conservó el registro anterior",
  conservar_nueva: "Se reemplazó por la fila nueva",
  guardar_ambas: "Se guardaron ambas filas",
  combinar: "Se guardó la combinación",
}

async function resolver(accion: Exclude<AccionDuplicado, "decidir_despues">) {
  ocupado.value = accion
  try {
    await s.datos.resolverDuplicado(
      token.value,
      p.dup.id,
      accion,
      accion === "combinar" && combinada.value ? combinada.value : undefined,
    )
    notificar({ tono: "exito", titulo: TITULOS[accion] })
    emit("resuelto")
  } catch (e) {
    informar(e)
    ocupado.value = null
  }
}
const etiquetaAnterior = computed(
  () => `Guardada · ${"archivo" in p.dup.existente ? p.dup.existente.archivo : ""}`,
)
</script>

<template>
  <Tarjeta :relleno="false" class="overflow-hidden border-2">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b-2 border-borde px-5 py-3.5">
      <p class="text-[14px] font-semibold">
        {{ nombreDeFila(dup.nueva) }}
        <span class="font-normal text-tenue">· {{ formatearFecha(dup.nueva.fechaRegistro) }}</span>
      </p>
      <Insignia :tono="diferencias ? 'aviso' : 'neutro'">
        {{ diferencias ? `${diferencias} ${diferencias === 1 ? "diferencia" : "diferencias"}` : "Idénticas" }}
      </Insignia>
    </div>
    <p v-if="combinando" class="border-b border-borde bg-acento-tenue/40 px-5 py-2 text-[12.5px] text-suave">
      Pulse en cada celda resaltada el valor que quiere conservar.
    </p>
    <ComparacionDuplicado
      v-model="elecciones"
      :anterior="dup.existente"
      :nueva="dup.nueva"
      :catalogo="catalogo"
      :etiqueta-anterior="etiquetaAnterior"
      :etiqueta-nueva="`Nueva · ${dup.nueva.archivo}, fila ${dup.nueva.numero}`"
      :combinando="combinando"
    />
    <ul
      v-if="erroresCombinada.length"
      class="space-y-0.5 border-t border-borde bg-peligro-tenue/50 px-5 py-2.5 text-[13px] text-peligro"
      role="alert"
    >
      <li v-for="(x, i) in erroresCombinada" :key="i">{{ etiquetaDe(x.campo, catalogo) }}: {{ x.mensaje }}</li>
    </ul>
    <div class="flex flex-wrap justify-end gap-2 border-t-2 border-borde px-5 py-3.5">
      <template v-if="combinando">
        <Boton variante="fantasma" :disabled="!!ocupado" @click="combinando = false">Cancelar</Boton>
        <Boton
          variante="primario"
          :icono="Combine"
          :disabled="!!ocupado || erroresCombinada.length > 0"
          :cargando="ocupado === 'combinar'"
          @click="resolver('combinar')"
        >
          Guardar combinación
        </Boton>
      </template>
      <template v-else>
        <Boton
          v-if="diferencias"
          variante="fantasma"
          :icono="Combine"
          :disabled="!!ocupado"
          @click="combinando = true"
        >
          Combinar celdas
        </Boton>
        <Boton :disabled="!!ocupado" :cargando="ocupado === 'guardar_ambas'" @click="resolver('guardar_ambas')">
          Guardar ambas
        </Boton>
        <Boton
          :disabled="!!ocupado"
          :cargando="ocupado === 'conservar_anterior'"
          @click="resolver('conservar_anterior')"
        >
          Conservar la guardada
        </Boton>
        <Boton
          variante="primario"
          :disabled="!!ocupado"
          :cargando="ocupado === 'conservar_nueva'"
          @click="resolver('conservar_nueva')"
        >
          Usar la nueva
        </Boton>
      </template>
    </div>
  </Tarjeta>
</template>

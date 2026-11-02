<script setup lang="ts">
import { computed, ref } from "vue"
import { ArrowLeft, Combine, ListChecks } from "@lucide/vue"
import type { AccionDuplicado, CombinacionCeldas } from "@/contracts"
import { formatearFecha } from "@/domain/dates"
import type { ColumnaCatalogo, FilaProcesada } from "@/domain/model"
import { Aviso, Boton, Insignia, Selector, Tarjeta } from "@/shared/ui"
import CorreccionFila from "../componentes/CorreccionFila.vue"
import DialogoCombinar from "../componentes/DialogoCombinar.vue"
import { nombreDeFila } from "../valores"
import type { DuplicadoLote, Lote } from "./preparar"

const lote = defineModel<Lote>({ required: true })
const p = defineProps<{ catalogo: ColumnaCatalogo[] | null; guardando: boolean }>()
const emit = defineEmits<{
  corregir: [uid: string, fila: FilaProcesada]
  descartarError: [uid: string]
  confirmar: []
  volver: []
}>()

const ACCIONES: { valor: AccionDuplicado; etiqueta: string }[] = [
  { valor: "decidir_despues", etiqueta: "Decidir después" },
  { valor: "conservar_anterior", etiqueta: "Conservar la anterior" },
  { valor: "conservar_nueva", etiqueta: "Usar la nueva" },
  { valor: "guardar_ambas", etiqueta: "Guardar ambas" },
]
const PASO = 10
const errVisibles = ref(PASO)
const dupVisibles = ref(20)

const listas = computed(() => lote.value.validas.length - lote.value.duplicados.length)

const anteriorDe = (d: DuplicadoLote) =>
  d.contra.origen === "guardado" ? d.contra.fila : lote.value.validas[d.contra.indice]
const origenContra = (d: DuplicadoLote) =>
  d.contra.origen === "guardado"
    ? `coincide con un registro guardado (${d.contra.fila.archivo})`
    : `repite la fila ${lote.value.validas[d.contra.indice].numero} de ${lote.value.validas[d.contra.indice].archivo}`

function fijar(i: number, cambios: Partial<DuplicadoLote>) {
  lote.value = {
    ...lote.value,
    duplicados: lote.value.duplicados.map((d, j) => (j === i ? { ...d, ...cambios } : d)),
  }
}
function fijarTodas(accion: AccionDuplicado) {
  lote.value = {
    ...lote.value,
    duplicados: lote.value.duplicados.map((d) => ({ ...d, accion, combinada: undefined })),
  }
}

/** Duplicado que se está combinando (índice dentro de `duplicados`). */
const combinando = ref<number | null>(null)
const actual = computed(() =>
  combinando.value === null ? null : lote.value.duplicados[combinando.value],
)
function aplicarCombinacion(r: { fila: FilaProcesada; combinacion: CombinacionCeldas }) {
  if (combinando.value !== null) fijar(combinando.value, { accion: "combinar", combinada: r })
  combinando.value = null
}
function elegirAccion(i: number, valor: string) {
  if (valor === "combinar") combinando.value = i
  else fijar(i, { accion: valor as AccionDuplicado, combinada: undefined })
}
</script>

<template>
  <div class="animar-aparecer space-y-5">
    <section v-if="lote.conError.length" aria-labelledby="titulo-errores" class="space-y-3">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="titulo-errores" class="text-[15px] font-semibold">
            Filas con errores
            <Insignia tono="peligro" class="ml-1 align-middle">{{ lote.conError.length }}</Insignia>
          </h2>
          <p class="text-[13px] text-tenue">
            Corríjalas para guardarlas con el resto. Las que deje sin corregir quedarán en Datos › Con errores.
          </p>
        </div>
      </div>
      <CorreccionFila
        v-for="f in lote.conError.slice(0, errVisibles)"
        :key="f.uid"
        :fila="f"
        :catalogo="catalogo"
        etiqueta-guardar="Validar corrección"
        etiqueta-descartar="No importar esta fila"
        :ocupado="guardando ? 'guardar' : null"
        @guardar="emit('corregir', f.uid, $event)"
        @descartar="emit('descartarError', f.uid)"
      />
      <div v-if="lote.conError.length > errVisibles" class="text-center">
        <Boton variante="enlace" tamano="sm" @click="errVisibles += PASO">
          Ver {{ Math.min(PASO, lote.conError.length - errVisibles) }} más
          (quedan {{ lote.conError.length - errVisibles }})
        </Boton>
      </div>
    </section>

    <Tarjeta v-if="lote.duplicados.length" :relleno="false" class="overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 class="text-[15px] font-semibold">Posibles duplicados</h2>
          <p class="text-[13px] text-tenue">
            Mismo paciente (o N° de atención) y misma fecha y hora de registro que otra fila.
          </p>
        </div>
        <label class="flex items-center gap-2 text-[13px] text-tenue">
          Para todos
          <Selector
            tamano="sm"
            class="w-48"
            model-value=""
            aria-label="Aplicar a todos los duplicados"
            @update:model-value="$event && fijarTodas($event as AccionDuplicado)"
          >
            <option value="">Elegir…</option>
            <option v-for="a in ACCIONES" :key="a.valor" :value="a.valor">{{ a.etiqueta }}</option>
          </Selector>
        </label>
      </div>
      <ul class="divide-y divide-borde border-t-2 border-borde">
        <li
          v-for="(d, i) in lote.duplicados.slice(0, dupVisibles)"
          :key="lote.validas[d.indice].uid"
          class="flex flex-wrap items-center gap-3 px-5 py-3 text-[13px]"
        >
          <div class="min-w-0 flex-1">
            <p class="font-medium">
              {{ nombreDeFila(lote.validas[d.indice]) }}
              <span class="font-normal text-tenue">· {{ formatearFecha(lote.validas[d.indice].fechaRegistro) }}</span>
            </p>
            <p class="text-[12.5px] text-tenue">
              {{ lote.validas[d.indice].archivo }}, fila {{ lote.validas[d.indice].numero }} · {{ origenContra(d) }}
            </p>
            <p v-if="d.accion === 'combinar' && d.combinada" class="mt-0.5 text-[12px] text-acento">
              Combinada:
              {{ Object.values(d.combinada.combinacion).filter((l) => l === "anterior").length }}
              celdas de la anterior, el resto de la nueva
            </p>
          </div>
          <Boton
            v-if="d.accion === 'combinar'"
            tamano="sm"
            variante="fantasma"
            :icono="Combine"
            @click="combinando = i"
          >
            Editar
          </Boton>
          <Selector
            :key="`${d.accion}-${combinando === i}`"
            tamano="sm"
            class="w-48"
            :model-value="d.accion"
            aria-label="Qué hacer con este duplicado"
            @update:model-value="elegirAccion(i, String($event))"
          >
            <option v-for="a in ACCIONES" :key="a.valor" :value="a.valor">{{ a.etiqueta }}</option>
            <option value="combinar">Combinar celdas…</option>
          </Selector>
        </li>
      </ul>
      <div v-if="lote.duplicados.length > 20" class="border-t border-borde px-5 py-2.5 text-center">
        <Boton
          variante="enlace"
          tamano="sm"
          @click="dupVisibles = dupVisibles > 20 ? 20 : lote.duplicados.length"
        >
          {{ dupVisibles > 20 ? "Mostrar menos" : `Ver los ${lote.duplicados.length}` }}
        </Boton>
      </div>
    </Tarjeta>

    <Aviso v-if="!lote.conError.length && !lote.duplicados.length" tono="exito">
      No queda nada por revisar: {{ listas.toLocaleString("es-CL") }} filas listas para guardar.
    </Aviso>
    <Aviso v-else-if="listas === 0 && lote.duplicados.length === 0" tono="aviso">
      Ninguna fila está lista para guardar. Si confirma, todas quedarán pendientes de corrección.
    </Aviso>

    <div class="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-borde bg-superficie/95 px-5 py-3.5 shadow-lg backdrop-blur">
      <Boton :icono="ArrowLeft" :disabled="guardando" @click="emit('volver')">Volver</Boton>
      <Boton variante="primario" :icono="ListChecks" :cargando="guardando" @click="emit('confirmar')">
        Confirmar importación
      </Boton>
    </div>

    <DialogoCombinar
      :abierto="!!actual"
      :anterior="actual ? anteriorDe(actual) : null"
      :nueva="actual ? lote.validas[actual.indice] : null"
      :catalogo="p.catalogo"
      :inicial="actual?.combinada?.combinacion"
      etiqueta-anterior="Anterior"
      etiqueta-nueva="Nueva"
      @cerrar="combinando = null"
      @aplicar="aplicarCombinacion"
    />
  </div>
</template>

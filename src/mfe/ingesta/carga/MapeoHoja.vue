<script setup lang="ts">
import { computed, ref } from "vue"
import { ChevronDown, EyeOff, FileSpreadsheet, ListFilter, TriangleAlert } from "@lucide/vue"
import {
  CAMPOS_CONOCIDOS,
  LISTA_CAMPOS_CONOCIDOS,
  detectarTipoPlanilla,
  type MapeoColumna,
} from "@/domain/columns"
import type { TipoCampo, TipoPlanilla } from "@/domain/model"
import { claveDesdeEncabezado, limpiarOriginal } from "@/domain/text"
import { Boton, Casilla, Insignia, Segmentado, Selector, cn } from "@/shared/ui"
import { esIgnoradaPermanente, faltaDocumento, problemasMapeo } from "./preparar"
import type { HojaElegida } from "./tipos"

const p = defineProps<{
  hoja: HojaElegida
  /** El archivo tiene más de una hoja: se muestra el nombre de la hoja. */
  varias: boolean
  ocupada: boolean
  ignoradas: string[]
}>()
const emit = defineEmits<{
  cambiar: [h: HojaElegida]
  cambiarEncabezado: [fila: number]
  ignorarSiempre: [encabezado: string]
}>()

const GRUPOS = [
  { grupo: "base", etiqueta: "Datos base del paciente" },
  { grupo: "paciente", etiqueta: "Otros datos del paciente" },
  { grupo: "registro", etiqueta: "Registro en PhilaxMed" },
  { grupo: "pago", etiqueta: "Atención y pago" },
]
const TIPOS_EXTRA: { valor: TipoCampo; etiqueta: string }[] = [
  { valor: "texto", etiqueta: "Texto" },
  { valor: "numero", etiqueta: "Número" },
  { valor: "monto", etiqueta: "Monto" },
  { valor: "fecha", etiqueta: "Fecha" },
]
const camposDe = (grupo: string) =>
  LISTA_CAMPOS_CONOCIDOS.filter((c) => CAMPOS_CONOCIDOS[c].grupo === grupo)

const abierta = ref(true)
const a = computed(() => p.hoja.analisis)
const problemas = computed(() =>
  p.hoja.incluir ? problemasMapeo(p.hoja.mapeo, p.hoja.tipoPlanilla) : [],
)
const sinDocumento = computed(() => p.hoja.incluir && faltaDocumento(p.hoja.mapeo, p.hoja.tipoPlanilla))
// problemasMapeo informa primero la falta de RUN; ese caso se muestra aparte, con una guía.
const otrosProblemas = computed(() => (sinDocumento.value ? problemas.value.slice(1) : problemas.value))
const ejemplos = computed(() =>
  a.value.vistaPrevia.slice(a.value.filaEncabezado + 1, a.value.filaEncabezado + 4),
)
const reconocidas = computed(
  () => p.hoja.mapeo.filter((m) => m.destino !== "extra" && m.destino !== "ignorar").length,
)
const resumenFila = (f: unknown[] | undefined) =>
  (f ?? [])
    .map(limpiarOriginal)
    .filter(Boolean)
    .slice(0, 4)
    .join(" · ")
    .slice(0, 70) || "(vacía)"
const ejemplosDe = (m: MapeoColumna) =>
  ejemplos.value
    .map((f) => limpiarOriginal(f[m.indice]))
    .filter(Boolean)
    .join(" · ")

const cambiar = (cambios: Partial<HojaElegida>) => emit("cambiar", { ...p.hoja, ...cambios })

function cambiarDestino(indice: number, valor: string) {
  const mapeo = p.hoja.mapeo.map((m): MapeoColumna => {
    if (m.indice !== indice) return m
    if (valor === "extra") {
      let clave = m.claveExtra ?? (claveDesdeEncabezado(m.encabezado) || `columna_${m.indice + 1}`)
      if (clave in CAMPOS_CONOCIDOS) clave = `extra_${clave}`
      while (p.hoja.mapeo.some((o) => o.indice !== indice && o.claveExtra === clave))
        clave = `${clave}_2`
      return { ...m, destino: "extra", claveExtra: clave, tipoExtra: m.tipoExtra ?? "texto" }
    }
    return { ...m, destino: valor as MapeoColumna["destino"] }
  })
  cambiar({ mapeo, tipoPlanilla: p.hoja.tipoManual ? p.hoja.tipoPlanilla : detectarTipoPlanilla(mapeo) })
}

const elegirTipo = (tipoPlanilla: TipoPlanilla) => cambiar({ tipoPlanilla, tipoManual: true })

const cambiarTipoExtra = (indice: number, tipo: TipoCampo) =>
  cambiar({ mapeo: p.hoja.mapeo.map((o) => (o.indice === indice ? { ...o, tipoExtra: tipo } : o)) })
</script>

<template>
  <section
    :class="
      cn(
        'overflow-hidden rounded-xl border-2 bg-superficie shadow-sm transition-colors',
        hoja.incluir ? 'border-borde-fuerte' : 'border-dashed border-borde',
      )
    "
    :aria-label="`${hoja.archivo}${varias ? `, hoja ${a.nombre}` : ''}`"
  >
    <div class="flex flex-wrap items-center gap-3 px-5 py-4">
      <span
        :class="
          cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            hoja.incluir ? 'bg-acento-tenue text-acento' : 'bg-superficie-3 text-tenue',
          )
        "
      >
        <FileSpreadsheet class="size-4" aria-hidden="true" />
      </span>
      <div :class="cn('min-w-0 flex-1', !hoja.incluir && 'opacity-70')">
        <p class="truncate text-[14.5px] font-semibold">
          <template v-if="varias">Hoja «{{ a.nombre }}»</template>
          <template v-else>{{ hoja.archivo }}</template>
        </p>
        <p class="text-[12.5px] text-tenue">
          {{ a.totalFilas.toLocaleString("es-CL") }} filas ·
          {{ reconocidas }} de {{ hoja.mapeo.length }} columnas reconocidas
          <template v-if="!hoja.incluir"> · no se importará</template>
        </p>
      </div>
      <Insignia v-if="problemas.length" tono="peligro" :icono="TriangleAlert">Revisar columnas</Insignia>
      <Casilla
        :model-value="hoja.incluir"
        :deshabilitada="ocupada"
        @update:model-value="cambiar({ incluir: $event })"
      >
        Importar esta hoja
      </Casilla>
      <button
        v-if="hoja.incluir"
        type="button"
        class="rounded-md p-1.5 text-tenue hover:bg-superficie-2 hover:text-texto"
        :aria-expanded="abierta"
        :aria-label="abierta ? 'Ocultar columnas' : 'Ver columnas'"
        @click="abierta = !abierta"
      >
        <ChevronDown :class="cn('size-4 transition-transform', abierta && 'rotate-180')" />
      </button>
    </div>

    <div v-if="abierta && hoja.incluir" class="border-t-2 border-borde">
      <div class="flex flex-wrap items-end gap-4 bg-superficie-2 px-5 py-3">
        <label class="min-w-64 flex-1 text-[12.5px] text-tenue">
          Fila de títulos
          <Selector
            tamano="sm"
            class="mt-1"
            :model-value="a.filaEncabezado"
            :disabled="ocupada"
            @update:model-value="emit('cambiarEncabezado', Number($event))"
          >
            <option v-for="(f, i) in a.vistaPrevia.slice(0, 15)" :key="i" :value="i">
              Fila {{ i + 1 }}: {{ resumenFila(f) }}
            </option>
          </Selector>
        </label>
        <div class="text-[12.5px] text-tenue">
          Tipo de planilla
          <Segmentado
            class="mt-1"
            tamano="sm"
            etiqueta="Tipo de planilla"
            :model-value="hoja.tipoPlanilla"
            :opciones="[
              { valor: 'pacientes', etiqueta: 'Pacientes' },
              { valor: 'pagos', etiqueta: 'Pagos' },
            ]"
            @update:model-value="elegirTipo($event as TipoPlanilla)"
          />
        </div>
      </div>
      <p
        v-if="hoja.tipoPlanilla === 'pagos'"
        class="border-t border-borde px-5 py-2 text-[12.5px] text-tenue"
      >
        En pagos el RUN es opcional: las filas sin documento se guardan sin asociarse a un paciente.
      </p>

      <div
        v-if="sinDocumento"
        class="flex flex-wrap items-start gap-x-4 gap-y-2 border-y border-borde bg-peligro-tenue/50 px-5 py-3 text-[13px]"
        role="alert"
      >
        <TriangleAlert class="mt-0.5 size-4 shrink-0 text-peligro" aria-hidden="true" />
        <div class="min-w-0 flex-1 space-y-1">
          <p class="font-medium text-peligro">No se encontró una columna con el RUN o pasaporte.</p>
          <p class="text-suave">
            En la tabla de abajo, elija «RUN / pasaporte» en «Se guarda como» para la columna que contiene el
            RUN/RUT de cada paciente.
          </p>
          <p class="text-suave">
            Si esta hoja corresponde a pagos sin RUT asociado, indíquelo marcando el tipo de planilla «Pagos»:
            los pagos se guardarán sin vincularse a un paciente.
          </p>
        </div>
        <Boton tamano="sm" :disabled="ocupada" @click="elegirTipo('pagos')">
          Es una planilla de pagos sin RUT
        </Boton>
      </div>

      <ul
        v-if="otrosProblemas.length"
        class="space-y-1 border-y border-borde bg-peligro-tenue/50 px-5 py-2.5 text-[13px] text-peligro"
        role="alert"
      >
        <li v-for="x in otrosProblemas" :key="x">{{ x }}</li>
      </ul>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] border-collapse text-left text-[13px]">
          <thead class="text-[12px] text-tenue">
            <tr class="border-b-2 border-borde">
              <th scope="col" class="px-5 py-2 font-medium">Columna en la planilla</th>
              <th scope="col" class="border-l border-borde px-5 py-2 font-medium">Ejemplos</th>
              <th scope="col" class="w-80 border-l border-borde px-5 py-2 font-medium">Se guarda como</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in hoja.mapeo"
              :key="m.indice"
              :class="cn('border-t border-borde', m.destino === 'ignorar' && 'bg-superficie-2/50 text-tenue')"
            >
              <td class="px-5 py-2.5">
                <p class="font-medium">{{ m.encabezado }}</p>
                <p
                  v-if="m.confianza === 'media' && m.destino !== 'extra' && m.destino !== 'ignorar'"
                  class="text-[11.5px] text-aviso"
                >
                  Coincidencia probable, confírmela
                </p>
                <template v-if="esIgnoradaPermanente(m.encabezado, ignoradas)">
                  <Insignia v-if="m.destino === 'ignorar'" class="mt-1" :icono="ListFilter">
                    Excluida por filtro predeterminado
                  </Insignia>
                  <p v-else class="text-[11.5px] text-tenue">Se importará pese al filtro predeterminado</p>
                </template>
              </td>
              <td class="max-w-64 border-l border-borde px-5 py-2.5 text-suave">
                <p class="truncate">
                  <template v-if="ejemplosDe(m)">{{ ejemplosDe(m) }}</template>
                  <span v-else class="text-tenue">Sin datos</span>
                </p>
              </td>
              <td class="border-l border-borde px-5 py-2">
                <div class="flex items-center gap-2">
                  <Selector
                    tamano="sm"
                    class="flex-1"
                    :model-value="m.destino"
                    :disabled="ocupada"
                    :aria-label="`Destino de «${m.encabezado}»`"
                    @update:model-value="cambiarDestino(m.indice, String($event))"
                  >
                    <optgroup v-for="g in GRUPOS" :key="g.grupo" :label="g.etiqueta">
                      <option v-for="c in camposDe(g.grupo)" :key="c" :value="c">
                        {{ CAMPOS_CONOCIDOS[c].etiqueta }}
                      </option>
                    </optgroup>
                    <optgroup label="Otras">
                      <option value="extra">Columna adicional</option>
                      <option value="ignorar">No importar</option>
                    </optgroup>
                  </Selector>
                  <Selector
                    v-if="m.destino === 'extra'"
                    tamano="sm"
                    class="w-28"
                    :model-value="m.tipoExtra ?? 'texto'"
                    aria-label="Tipo de dato"
                    @update:model-value="cambiarTipoExtra(m.indice, $event as TipoCampo)"
                  >
                    <option v-for="t in TIPOS_EXTRA" :key="t.valor" :value="t.valor">{{ t.etiqueta }}</option>
                  </Selector>
                  <button
                    v-if="m.destino === 'ignorar' && !esIgnoradaPermanente(m.encabezado, ignoradas)"
                    type="button"
                    class="flex size-8 shrink-0 items-center justify-center rounded-md text-tenue hover:bg-superficie-3 hover:text-texto"
                    :title="`Ignorar «${m.encabezado}» siempre en próximas cargas`"
                    :aria-label="`Ignorar «${m.encabezado}» siempre en próximas cargas`"
                    @click="emit('ignorarSiempre', m.encabezado)"
                  >
                    <EyeOff class="size-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

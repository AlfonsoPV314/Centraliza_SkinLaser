<script setup lang="ts">
import { computed } from "vue"
import { Check } from "@lucide/vue"
import type { ColumnaCatalogo, FilaGuardada, FilaProcesada } from "@/domain/model"
import { camposComparables, ladoSugerido, type EleccionesCombinacion, type Lado } from "@/domain/merge"
import { cn } from "@/shared/ui"
import { etiquetaDe, mostrarValor, tipoDe } from "../valores"

/**
 * Tabla lado a lado de dos versiones de una fila. Con `combinando`, cada celda distinta se puede elegir
 * para armar una fila combinada (v-model con el lado elegido por campo).
 */
const p = defineProps<{
  anterior: FilaGuardada | FilaProcesada
  nueva: FilaProcesada
  catalogo: ColumnaCatalogo[] | null
  etiquetaAnterior: string
  etiquetaNueva: string
  combinando?: boolean
}>()
const elecciones = defineModel<EleccionesCombinacion>({ default: () => ({}) })

const valor = (f: FilaGuardada | FilaProcesada, c: string) =>
  f.campos[c]?.n ?? f.campos[c]?.o ?? ""
const claves = computed(() => camposComparables(p.anterior, p.nueva))
const distinto = (c: string) => valor(p.anterior, c) !== valor(p.nueva, c)
const lado = (c: string): Lado => elecciones.value[c] ?? ladoSugerido(p.anterior, p.nueva, c)
const elegir = (c: string, l: Lado) => (elecciones.value = { ...elecciones.value, [c]: l })
const texto = (f: FilaGuardada | FilaProcesada, c: string) =>
  mostrarValor(tipoDe(c, p.catalogo), f.campos[c])
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[560px] border-collapse text-left text-[13px]">
      <caption class="sr-only">
        Comparación entre {{ etiquetaAnterior }} y {{ etiquetaNueva }}
      </caption>
      <thead class="bg-superficie-2 text-[12px] text-tenue">
        <tr>
          <th scope="col" class="w-1/4 px-5 py-2 font-medium">Campo</th>
          <th scope="col" class="border-l-2 border-borde-fuerte px-5 py-2 font-medium">
            {{ etiquetaAnterior }}
          </th>
          <th scope="col" class="border-l-2 border-borde-fuerte px-5 py-2 font-medium">
            {{ etiquetaNueva }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="c in claves"
          :key="c"
          :class="cn('border-t border-borde', distinto(c) && 'bg-aviso-tenue/40')"
        >
          <th scope="row" class="px-5 py-2 font-normal text-tenue">{{ etiquetaDe(c, catalogo) }}</th>
          <td
            v-for="l in (['anterior', 'nueva'] as const)"
            :key="l"
            class="border-l-2 border-borde-fuerte p-0 align-top"
          >
            <button
              v-if="combinando && distinto(c)"
              type="button"
              :aria-pressed="lado(c) === l"
              :aria-label="`Usar ${l === 'anterior' ? etiquetaAnterior : etiquetaNueva} para ${etiquetaDe(c, catalogo)}`"
              :class="
                cn(
                  'flex w-full items-start gap-2 px-5 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-acento',
                  lado(c) === l
                    ? 'bg-acento-tenue font-medium text-texto'
                    : 'text-tenue line-through decoration-borde-fuerte hover:bg-superficie-2',
                )
              "
              @click="elegir(c, l)"
            >
              <span
                :class="
                  cn(
                    'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                    lado(c) === l ? 'border-acento bg-acento text-sobre-acento' : 'border-borde-fuerte',
                  )
                "
              >
                <Check v-if="lado(c) === l" class="size-3" aria-hidden="true" />
              </span>
              <span class="min-w-0 break-words">{{ texto(l === "anterior" ? anterior : nueva, c) || "—" }}</span>
            </button>
            <span
              v-else
              :class="cn('block px-5 py-2 break-words', l === 'nueva' && distinto(c) && 'font-medium')"
            >
              <template v-if="texto(l === 'anterior' ? anterior : nueva, c)">
                {{ texto(l === "anterior" ? anterior : nueva, c) }}
              </template>
              <span v-else class="text-tenue">—</span>
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

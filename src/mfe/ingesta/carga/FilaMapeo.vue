<script setup lang="ts">
import { ListFilter, EyeOff } from "@lucide/vue"
import type { MapeoColumna } from "@/domain/columns"
import type { TipoCampo } from "@/domain/model"
import { Insignia, Selector, SelectorBuscable, cn, type OpcionBuscable } from "@/shared/ui"
import { esIgnoradaPermanente } from "./preparar"

defineProps<{
  m: MapeoColumna
  ejemplos: string
  opciones: OpcionBuscable[]
  ignoradas: string[]
  ocupada: boolean
}>()
const emit = defineEmits<{
  destino: [valor: string]
  tipoExtra: [tipo: TipoCampo]
  ignorarSiempre: []
}>()

const TIPOS_EXTRA: { valor: TipoCampo; etiqueta: string }[] = [
  { valor: "texto", etiqueta: "Texto" },
  { valor: "numero", etiqueta: "Número" },
  { valor: "monto", etiqueta: "Monto" },
  { valor: "fecha", etiqueta: "Fecha" },
]
</script>

<template>
  <tr :class="cn('border-t border-borde', m.destino === 'ignorar' && 'bg-superficie-2/50 text-tenue')">
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
        <template v-if="ejemplos">{{ ejemplos }}</template>
        <span v-else class="text-tenue">Sin datos</span>
      </p>
    </td>
    <td class="border-l border-borde px-5 py-2">
      <div class="flex items-center gap-2">
        <SelectorBuscable
          tamano="sm"
          class="flex-1"
          :model-value="m.destino"
          :opciones="opciones"
          :disabled="ocupada"
          :aria-label="`Destino de «${m.encabezado}»`"
          @update:model-value="emit('destino', $event)"
        />
        <Selector
          v-if="m.destino === 'extra'"
          tamano="sm"
          class="w-28"
          :model-value="m.tipoExtra ?? 'texto'"
          aria-label="Tipo de dato"
          @update:model-value="emit('tipoExtra', $event as TipoCampo)"
        >
          <option v-for="t in TIPOS_EXTRA" :key="t.valor" :value="t.valor">{{ t.etiqueta }}</option>
        </Selector>
        <button
          v-if="m.destino === 'ignorar' && !esIgnoradaPermanente(m.encabezado, ignoradas)"
          type="button"
          class="flex size-8 shrink-0 items-center justify-center rounded-md text-tenue hover:bg-superficie-3 hover:text-texto"
          :title="`Excluir «${m.encabezado}» de todas las importaciones`"
          :aria-label="`Excluir «${m.encabezado}» de todas las importaciones`"
          @click="emit('ignorarSiempre')"
        >
          <EyeOff class="size-4" />
        </button>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { ArrowDown, ArrowUp, Copy, FileSpreadsheet, FileText, Plus, Trash2 } from "@lucide/vue"
import { nuevoId } from "@/domain/filters"
import type { ColumnaCatalogo } from "@/domain/model"
import type { ArchivoPlantilla, Bloque, TipoBloque } from "@/domain/templates"
import { Boton, Campo, Entrada, Segmentado, Tarjeta, cn } from "@/shared/ui"
import { TIPOS_BLOQUE, mover } from "./bloques"
import EditorGrafico from "./EditorGrafico.vue"
import EditorMedidas from "./EditorMedidas.vue"
import EditorTabla from "./EditorTabla.vue"
import EditorTexto from "./EditorTexto.vue"

const p = defineProps<{
  a: ArchivoPlantilla
  errores: Record<string, string>
  columnas: ColumnaCatalogo[]
  primero: boolean
  ultimo: boolean
}>()
const emit = defineEmits<{
  cambiar: [a: ArchivoPlantilla]
  agregarBloque: [t: TipoBloque]
  mover: [delta: number]
  quitar: []
}>()

const errNombre = computed(() => p.errores[`archivo:${p.a.id}:nombre`])
const errBloques = computed(() => p.errores[`archivo:${p.a.id}:bloques`])
const cambiar = (parcial: Partial<ArchivoPlantilla>) => emit("cambiar", { ...p.a, ...parcial })
const fijarBloque = (b: Bloque) => cambiar({ bloques: p.a.bloques.map((y) => (y.id === b.id ? b : y)) })
const errorDe = (b: Bloque) => (campo: string) => p.errores[`bloque:${b.id}:${campo}`]
const conError = (b: Bloque) => Object.keys(p.errores).some((k) => k.startsWith(`bloque:${b.id}:`))
const tipoDe = (b: Bloque) => TIPOS_BLOQUE.find((t) => t.tipo === b.tipo)!
const duplicar = (b: Bloque, i: number) =>
  cambiar({
    bloques: [
      ...p.a.bloques.slice(0, i + 1),
      { ...b, id: nuevoId("b"), titulo: b.titulo ? `${b.titulo} (copia)` : "" },
      ...p.a.bloques.slice(i + 1),
    ],
  })
</script>

<template>
  <Tarjeta :id="`archivo-${a.id}`" :relleno="false" class="scroll-mt-6 overflow-hidden">
    <div class="flex flex-wrap items-start gap-3 border-b border-borde bg-superficie-2/50 px-5 py-4">
      <span
        :class="
          cn(
            'mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg',
            a.formato === 'excel' ? 'bg-exito-tenue text-exito' : 'bg-peligro-tenue text-peligro',
          )
        "
        aria-hidden="true"
      >
        <FileSpreadsheet v-if="a.formato === 'excel'" class="size-4.5" />
        <FileText v-else class="size-4.5" />
      </span>
      <Campo class="min-w-48 flex-1" :error="errNombre">
        <Entrada
          :id="`archivo-${a.id}-nombre`"
          :model-value="a.nombre"
          placeholder="Nombre del archivo"
          aria-label="Nombre del archivo"
          :invalido="!!errNombre"
          @update:model-value="cambiar({ nombre: String($event ?? '') })"
        >
          <template #sufijo>
            <span class="pr-2 text-[12px] text-tenue">.{{ a.formato === "excel" ? "xlsx" : "pdf" }}</span>
          </template>
        </Entrada>
      </Campo>
      <Segmentado
        etiqueta="Formato"
        :model-value="a.formato"
        :opciones="[
          { valor: 'excel', etiqueta: 'Excel' },
          { valor: 'pdf', etiqueta: 'PDF' },
        ]"
        @update:model-value="cambiar({ formato: $event })"
      />
      <div class="ml-auto flex items-center gap-0.5">
        <Boton variante="fantasma" solo-icono aria-label="Subir archivo" :disabled="primero" :icono="ArrowUp" @click="emit('mover', -1)" />
        <Boton variante="fantasma" solo-icono aria-label="Bajar archivo" :disabled="ultimo" :icono="ArrowDown" @click="emit('mover', 1)" />
        <Boton variante="fantasma" solo-icono aria-label="Quitar archivo" :icono="Trash2" @click="emit('quitar')" />
      </div>
    </div>

    <div class="space-y-3 p-5">
      <div
        v-for="(b, ib) in a.bloques"
        :id="`bloque-${b.id}`"
        :key="b.id"
        :class="cn('scroll-mt-6 rounded-xl border p-4', conError(b) ? 'border-peligro/40' : 'border-borde')"
      >
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <span class="flex items-center gap-1.5 rounded-md bg-superficie-2 px-2 py-1 text-[12px] font-medium text-suave">
            <component :is="tipoDe(b).icono" class="size-3.5" aria-hidden="true" />
            {{ tipoDe(b).nombre }}
          </span>
          <div class="min-w-40 flex-1">
            <Entrada
              class="max-w-sm"
              placeholder="Título (opcional)"
              aria-label="Título del bloque"
              :model-value="b.titulo"
              @update:model-value="fijarBloque({ ...b, titulo: String($event ?? '') })"
            />
          </div>
          <div class="ml-auto flex items-center gap-0.5">
            <Boton tamano="sm" variante="fantasma" solo-icono aria-label="Subir" :disabled="ib === 0" :icono="ArrowUp" @click="cambiar({ bloques: mover(a.bloques, ib, -1) })" />
            <Boton tamano="sm" variante="fantasma" solo-icono aria-label="Bajar" :disabled="ib === a.bloques.length - 1" :icono="ArrowDown" @click="cambiar({ bloques: mover(a.bloques, ib, 1) })" />
            <Boton tamano="sm" variante="fantasma" solo-icono aria-label="Duplicar" :icono="Copy" @click="duplicar(b, ib)" />
            <Boton tamano="sm" variante="fantasma" solo-icono aria-label="Quitar" :icono="Trash2" @click="cambiar({ bloques: a.bloques.filter((y) => y.id !== b.id) })" />
          </div>
        </div>
        <EditorTabla v-if="b.tipo === 'tabla'" :b="b" :columnas="columnas" :error="errorDe(b)" @cambiar="fijarBloque" />
        <EditorGrafico v-else-if="b.tipo === 'grafico'" :b="b" :columnas="columnas" :error="errorDe(b)" @cambiar="fijarBloque" />
        <EditorMedidas v-else-if="b.tipo === 'medidas'" :b="b" :columnas="columnas" :error="errorDe(b)" @cambiar="fijarBloque" />
        <EditorTexto v-else-if="b.tipo === 'texto'" :b="b" :columnas="columnas" :error="errorDe(b)" @cambiar="fijarBloque" />
      </div>

      <div
        :id="`archivo-${a.id}-bloques`"
        :class="cn('scroll-mt-6 rounded-xl border border-dashed p-3', errBloques ? 'border-peligro/50' : 'border-borde')"
      >
        <p :class="cn('mb-2 text-[12.5px]', errBloques ? 'text-peligro' : 'text-tenue')">
          {{ errBloques ?? (a.bloques.length ? "Agregar otro contenido" : "Este archivo aún no tiene contenido") }}
        </p>
        <div class="grid gap-2 sm:grid-cols-4">
          <button
            v-for="t in TIPOS_BLOQUE"
            :key="t.tipo"
            type="button"
            class="group flex items-start gap-2.5 rounded-lg border border-borde bg-superficie px-3 py-2.5 text-left transition-colors hover:border-acento/50 hover:bg-acento-tenue/40"
            @click="emit('agregarBloque', t.tipo)"
          >
            <component :is="t.icono" class="mt-0.5 size-4 shrink-0 text-tenue group-hover:text-acento" aria-hidden="true" />
            <span>
              <span class="flex items-center gap-1 text-[13px] font-medium">
                <Plus class="size-3" aria-hidden="true" />
                {{ t.nombre }}
              </span>
              <span class="block text-[12px] leading-snug text-tenue">{{ t.ayuda }}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  </Tarjeta>
</template>

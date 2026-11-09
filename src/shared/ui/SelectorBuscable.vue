<script setup lang="ts">
// Combobox accesible: botón que abre una lista con buscador. Reemplaza a <select> en listas largas
// (columnas, campos). Busca sin distinguir mayúsculas ni tildes, en cualquier parte del texto.
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from "vue"
import { Check, ChevronDown, Search } from "@lucide/vue"
import { normalizarTexto } from "@/domain/text"
import { cn } from "./cn"
import { BASE_CONTROL } from "./estilos"
import type { OpcionBuscable } from "./tipos"


defineOptions({ inheritAttrs: false })
const modelo = defineModel<string>({ default: "" })
const p = withDefaults(
  defineProps<{
    opciones: OpcionBuscable[]
    placeholder?: string
    tamano?: "sm" | "md"
    invalido?: boolean
    disabled?: boolean
    class?: string
    id?: string
    ariaLabel?: string
    /** Etiqueta del valor actual cuando no está entre las opciones. */
    etiquetaDesconocida?: (v: string) => string
  }>(),
  { placeholder: "Elegir…", tamano: "md" },
)

const uid = useId()
const abierto = ref(false)
const texto = ref("")
const activo = ref(0)
const boton = ref<HTMLButtonElement>()
const buscador = ref<HTMLInputElement>()
const listaEl = ref<HTMLUListElement>()
const panel = ref<HTMLDivElement>()
const pos = ref({ top: 0, left: 0, width: 0, maxHeight: 320, arriba: false })

const seleccionada = computed(() => p.opciones.find((o) => o.valor === modelo.value))
const etiquetaActual = computed(() => {
  if (seleccionada.value) return seleccionada.value.etiqueta
  if (!modelo.value) return ""
  return p.etiquetaDesconocida?.(modelo.value) ?? modelo.value
})
const filtradas = computed(() => {
  const q = normalizarTexto(texto.value).trim()
  if (!q) return p.opciones
  return p.opciones.filter((o) => normalizarTexto(`${o.etiqueta} ${o.detalle ?? ""} ${o.valor}`).includes(q))
})
const conGrupo = computed(() =>
  filtradas.value.map((o, i) => ({ o, i, encabezado: o.grupo && o.grupo !== filtradas.value[i - 1]?.grupo ? o.grupo : null })),
)
watch(texto, () => (activo.value = 0))

function ubicar() {
  const r = boton.value?.getBoundingClientRect()
  if (!r) return
  const abajo = window.innerHeight - r.bottom - 12
  const encima = r.top - 12
  const arriba = abajo < 240 && encima > abajo
  pos.value = {
    top: arriba ? r.top - 4 : r.bottom + 4,
    left: Math.min(r.left, window.innerWidth - Math.max(r.width, 280) - 8),
    width: Math.max(r.width, 280),
    maxHeight: Math.min(360, arriba ? encima : abajo),
    arriba,
  }
}

async function abrir() {
  if (p.disabled) return
  ubicar()
  texto.value = ""
  abierto.value = true
  activo.value = Math.max(0, filtradas.value.findIndex((o) => o.valor === modelo.value))
  await nextTick()
  buscador.value?.focus()
  desplazarActivo()
}
function cerrar(devolverFoco = true) {
  if (!abierto.value) return
  abierto.value = false
  if (devolverFoco) boton.value?.focus()
}
function elegir(o: OpcionBuscable) {
  modelo.value = o.valor
  cerrar()
}
function desplazarActivo() {
  nextTick(() => listaEl.value?.querySelector(`[data-i="${activo.value}"]`)?.scrollIntoView({ block: "nearest" }))
}
function tecla(e: KeyboardEvent) {
  const n = filtradas.value.length
  if (e.key === "ArrowDown") {
    e.preventDefault()
    activo.value = n ? (activo.value + 1) % n : 0
    desplazarActivo()
  } else if (e.key === "ArrowUp") {
    e.preventDefault()
    activo.value = n ? (activo.value - 1 + n) % n : 0
    desplazarActivo()
  } else if (e.key === "Enter") {
    e.preventDefault()
    const o = filtradas.value[activo.value]
    if (o) elegir(o)
  } else if (e.key === "Escape") {
    e.preventDefault()
    e.stopPropagation()
    cerrar()
  } else if (e.key === "Tab") cerrar(false)
}

function fuera(e: Event) {
  const t = e.target as Node
  if (panel.value?.contains(t) || boton.value?.contains(t)) return
  cerrar(false)
}
function alDesplazar(e: Event) {
  if (panel.value?.contains(e.target as Node)) return
  ubicar()
}
function escuchar(activar: boolean) {
  if (activar) {
    document.addEventListener("pointerdown", fuera, true)
    window.addEventListener("scroll", alDesplazar, true)
    window.addEventListener("resize", ubicar)
  } else {
    document.removeEventListener("pointerdown", fuera, true)
    window.removeEventListener("scroll", alDesplazar, true)
    window.removeEventListener("resize", ubicar)
  }
}
watch(abierto, escuchar)
onBeforeUnmount(() => escuchar(false))
</script>

<template>
  <div :class="cn('relative', p.class)">
    <button
      :id="id"
      ref="boton"
      type="button"
      v-bind="$attrs"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="abierto"
      :aria-controls="`${uid}-lista`"
      :aria-label="ariaLabel"
      :aria-invalid="invalido || undefined"
      :disabled="disabled"
      :class="
        cn(
          BASE_CONTROL,
          'flex items-center gap-2 pr-8 text-left',
          tamano === 'sm' ? 'h-8 text-[13px]' : 'h-9',
          invalido ? 'border-peligro' : 'border-borde',
          abierto && 'border-acento ring-3 ring-acento/15',
        )
      "
      @click="abierto ? cerrar() : abrir()"
      @keydown.down.prevent="abrir"
    >
      <span :class="cn('min-w-0 flex-1 truncate', !etiquetaActual && 'text-tenue')">
        {{ etiquetaActual || placeholder }}
      </span>
    </button>
    <ChevronDown
      class="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-tenue"
      aria-hidden="true"
    />

    <Teleport to="body">
      <div
        v-if="abierto"
        ref="panel"
        class="fixed z-[70] flex flex-col overflow-hidden rounded-lg border border-borde bg-superficie shadow-xl"
        :style="{
          top: `${pos.top}px`,
          left: `${pos.left}px`,
          width: `${pos.width}px`,
          maxHeight: `${pos.maxHeight}px`,
          transform: pos.arriba ? 'translateY(-100%)' : undefined,
        }"
      >
        <div class="relative border-b border-borde p-1.5">
          <Search class="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-tenue" aria-hidden="true" />
          <input
            ref="buscador"
            v-model="texto"
            type="text"
            role="searchbox"
            class="h-8 w-full rounded-md bg-superficie-2 pr-2 pl-8 text-[13px] outline-none placeholder:text-tenue focus:ring-2 focus:ring-acento/30"
            placeholder="Buscar…"
            aria-label="Buscar opción"
            :aria-controls="`${uid}-lista`"
            :aria-activedescendant="filtradas.length ? `${uid}-op-${activo}` : undefined"
            autocomplete="off"
            @keydown="tecla"
          />
        </div>
        <ul :id="`${uid}-lista`" ref="listaEl" role="listbox" class="min-h-0 flex-1 overflow-y-auto py-1" :aria-label="ariaLabel">
          <template v-for="{ o, i, encabezado } in conGrupo" :key="o.valor">
            <li
              v-if="encabezado"
              role="presentation"
              class="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-tenue uppercase"
            >
              {{ encabezado }}
            </li>
            <li
              :id="`${uid}-op-${i}`"
              role="option"
              :data-i="i"
              :aria-selected="o.valor === modelo"
              :class="
                cn(
                  'mx-1 flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px]',
                  i === activo ? 'bg-acento-tenue text-texto' : 'hover:bg-superficie-2',
                )
              "
              @pointerenter="activo = i"
              @click="elegir(o)"
            >
              <span class="min-w-0 flex-1 truncate">{{ o.etiqueta }}</span>
              <span v-if="o.detalle" class="shrink-0 text-[11.5px] text-tenue">{{ o.detalle }}</span>
              <Check v-if="o.valor === modelo" class="size-3.5 shrink-0 text-acento" aria-hidden="true" />
            </li>
          </template>
          <li v-if="!filtradas.length" class="px-3 py-3 text-center text-[13px] text-tenue">
            Ninguna opción coincide con «{{ texto }}»
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

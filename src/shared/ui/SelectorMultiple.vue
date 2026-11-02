<script setup lang="ts">
import { computed, ref, type Component } from "vue"
import { Check, ChevronDown, Search, X } from "@lucide/vue"
import { normalizarTexto } from "@/domain/text"
import { useClickFuera } from "@/shared/hooks"
import { cn } from "./cn"
import type { OpcionSelector } from "./tipos"

/** Selector de varios valores con búsqueda; los elegidos se muestran como fichas (en el orden elegido). */
const valores = defineModel<string[]>({ required: true })
const p = withDefaults(
  defineProps<{
    opciones: OpcionSelector[]
    marcador?: string
    permitirLibre?: boolean
    vacio?: string
    invalido?: boolean
    unico?: boolean
    icono?: Component
  }>(),
  { marcador: "Elegir…", vacio: "Sin coincidencias" },
)
const abierto = ref(false)
const q = ref("")
const raiz = ref<HTMLDivElement>()
useClickFuera(raiz, () => (abierto.value = false), abierto)

const mapa = computed(() => new Map(p.opciones.map((o) => [o.valor, o])))
const filtradas = computed(() => {
  const nq = normalizarTexto(q.value)
  return p.opciones
    .filter((o) => !nq || normalizarTexto(`${o.etiqueta} ${o.detalle ?? ""}`).includes(nq))
    .slice(0, 200)
})
const grupos = computed(() => {
  const g = new Map<string, OpcionSelector[]>()
  for (const o of filtradas.value) g.set(o.grupo ?? "", [...(g.get(o.grupo ?? "") ?? []), o])
  return [...g]
})

function alternar(v: string) {
  if (p.unico) {
    valores.value = [v]
    abierto.value = false
    return
  }
  valores.value = valores.value.includes(v)
    ? valores.value.filter((x) => x !== v)
    : [...valores.value, v]
}
function enter() {
  if (filtradas.value[0]) alternar(filtradas.value[0].valor)
  else if (p.permitirLibre && q.value.trim()) {
    alternar(q.value.trim())
    q.value = ""
  }
}
</script>

<template>
  <div ref="raiz" class="relative">
    <div
      role="button"
      tabindex="0"
      :aria-expanded="abierto"
      :class="
        cn(
          'flex min-h-9 w-full cursor-pointer flex-wrap items-center gap-1 rounded-lg border bg-superficie py-1 pr-8 pl-2 text-sm transition-colors',
          abierto ? 'border-acento ring-3 ring-acento/15' : invalido ? 'border-peligro' : 'border-borde hover:border-borde-fuerte',
        )
      "
      @click="abierto = true"
      @keydown.enter.space.down.prevent="abierto = true"
    >
      <component :is="icono" v-if="icono" class="mr-0.5 size-4 text-tenue" />
      <span v-if="valores.length === 0" class="px-1 text-tenue">{{ marcador }}</span>
      <span
        v-for="v in valores"
        :key="v"
        class="inline-flex h-6 max-w-full items-center gap-1 rounded-md bg-superficie-3 pr-1 pl-2 text-[12.5px]"
      >
        <span class="truncate">{{ mapa.get(v)?.etiqueta ?? v }}</span>
        <button
          v-if="!unico"
          type="button"
          class="flex size-4 items-center justify-center rounded text-tenue hover:text-texto"
          :aria-label="`Quitar ${mapa.get(v)?.etiqueta ?? v}`"
          @click.stop="valores = valores.filter((x) => x !== v)"
        >
          <X class="size-3" />
        </button>
      </span>
      <ChevronDown class="pointer-events-none absolute top-2.5 right-2.5 size-4 text-tenue" />
    </div>
    <div
      v-if="abierto"
      class="animar-aparecer absolute z-40 mt-1 w-full min-w-64 overflow-hidden rounded-xl border border-borde bg-superficie shadow-2xl"
    >
      <div class="flex items-center gap-2 border-b border-borde px-3">
        <Search class="size-4 text-tenue" />
        <input
          v-model="q"
          autofocus
          :placeholder="permitirLibre ? 'Buscar o escribir un valor…' : 'Buscar…'"
          class="h-10 w-full bg-transparent text-sm outline-none placeholder:text-tenue"
          @keydown.esc="abierto = false"
          @keydown.enter.prevent="enter"
        />
      </div>
      <div class="max-h-72 overflow-y-auto p-1">
        <div v-for="[g, ops] in grupos" :key="g || '_'">
          <p v-if="g" class="px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-tenue uppercase">{{ g }}</p>
          <button
            v-for="o in ops"
            :key="o.valor"
            type="button"
            :class="cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-superficie-2', valores.includes(o.valor) && 'text-acento')"
            @click="alternar(o.valor)"
          >
            <span
              :class="
                cn(
                  'flex size-4 shrink-0 items-center justify-center rounded border',
                  valores.includes(o.valor) ? 'border-acento bg-acento text-sobre-acento' : 'border-borde-fuerte',
                  unico && 'rounded-full',
                )
              "
            >
              <Check v-if="valores.includes(o.valor)" class="size-3" :stroke-width="3" />
            </span>
            <span class="min-w-0 flex-1 truncate">{{ o.etiqueta }}</span>
            <span v-if="o.detalle" class="shrink-0 text-[12px] text-tenue">{{ o.detalle }}</span>
          </button>
        </div>
        <template v-if="filtradas.length === 0">
          <button
            v-if="permitirLibre && q.trim()"
            type="button"
            class="w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-superficie-2"
            @click="(alternar(q.trim()), (q = ''))"
          >
            Agregar «{{ q.trim() }}»
          </button>
          <p v-else class="px-3 py-4 text-center text-[13px] text-tenue">{{ vacio }}</p>
        </template>
      </div>
    </div>
  </div>
</template>

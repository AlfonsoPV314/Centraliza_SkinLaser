<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue"
import { X } from "@lucide/vue"
import { cn } from "./cn"

const p = withDefaults(
  defineProps<{
    abierto: boolean
    titulo: string
    descripcion?: string
    ancho?: "sm" | "md" | "lg" | "xl"
    cerrable?: boolean
  }>(),
  { ancho: "md", cerrable: true },
)
const emit = defineEmits<{ cerrar: [] }>()
const caja = ref<HTMLDivElement>()
let previo: HTMLElement | null = null

const cerrar = () => p.cerrable && emit("cerrar")

function tecla(e: KeyboardEvent) {
  if (e.key === "Escape") cerrar()
  if (e.key === "Tab" && caja.value) {
    const f = [
      ...caja.value.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((x) => !x.hasAttribute("disabled"))
    if (!f.length) return
    if (e.shiftKey && document.activeElement === f[0]) {
      e.preventDefault()
      f[f.length - 1].focus()
    } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
      e.preventDefault()
      f[0].focus()
    }
  }
}

function soltar() {
  document.removeEventListener("keydown", tecla)
  document.body.style.overflow = ""
}

watch(
  () => p.abierto,
  async (a) => {
    if (!a) {
      soltar()
      previo?.focus?.()
      return
    }
    previo = document.activeElement as HTMLElement | null
    document.addEventListener("keydown", tecla)
    document.body.style.overflow = "hidden"
    await nextTick()
    caja.value
      ?.querySelector<HTMLElement>(
        "[data-autofoco], input:not([type=hidden]), select, textarea, button:not([data-cerrar])",
      )
      ?.focus()
  },
  { immediate: true },
)
onBeforeUnmount(soltar)
</script>

<template>
  <Teleport to="body">
    <div v-if="abierto" class="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div class="absolute inset-0 bg-black/45 backdrop-blur-[2px]" aria-hidden="true" @click="cerrar" />
      <div
        ref="caja"
        role="dialog"
        aria-modal="true"
        :aria-label="titulo"
        :class="
          cn(
            'animar-aparecer relative flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-borde bg-superficie shadow-2xl sm:rounded-2xl',
            { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-5xl' }[ancho],
          )
        "
      >
        <div class="flex items-start justify-between gap-4 border-b border-borde px-5 py-4">
          <div>
            <h2 class="text-base font-semibold tracking-tight">{{ titulo }}</h2>
            <p v-if="descripcion || $slots.descripcion" class="mt-1 text-[13px] text-suave">
              <slot name="descripcion">{{ descripcion }}</slot>
            </p>
          </div>
          <button
            v-if="cerrable"
            data-cerrar
            type="button"
            class="-mr-1 flex size-8 items-center justify-center rounded-md text-tenue hover:bg-superficie-2 hover:text-texto"
            aria-label="Cerrar"
            @click="emit('cerrar')"
          >
            <X class="size-4" />
          </button>
        </div>
        <div v-if="$slots.default" class="overflow-y-auto px-5 py-4"><slot /></div>
        <div
          v-if="$slots.pie"
          class="flex flex-wrap items-center justify-end gap-2 border-t border-borde bg-superficie-2/50 px-5 py-3"
        >
          <slot name="pie" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

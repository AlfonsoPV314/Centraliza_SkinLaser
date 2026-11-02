<script setup lang="ts">
import type { Component } from "vue"
import { LoaderCircle } from "@lucide/vue"
import { cn } from "./cn"

type Variante = "primario" | "secundario" | "fantasma" | "peligro" | "enlace"
type Tamano = "sm" | "md" | "lg"

const p = withDefaults(
  defineProps<{
    variante?: Variante
    tamano?: Tamano
    cargando?: boolean
    icono?: Component
    iconoDerecha?: Component
    soloIcono?: boolean
    disabled?: boolean
    type?: "button" | "submit" | "reset"
  }>(),
  { variante: "secundario", tamano: "md", type: "button" },
)

const VARIANTES: Record<Variante, string> = {
  primario: "bg-acento text-sobre-acento hover:bg-acento-fuerte font-medium shadow-sm",
  secundario:
    "bg-superficie-2 text-texto border border-borde hover:border-borde-fuerte hover:bg-superficie-3",
  fantasma: "text-suave hover:text-texto hover:bg-superficie-2",
  peligro:
    "bg-peligro-tenue text-peligro border border-peligro/30 hover:bg-peligro hover:text-white",
  enlace: "text-acento hover:text-acento-fuerte underline-offset-4 hover:underline px-0! h-auto!",
}
const TAMANOS: Record<Tamano, string> = {
  sm: "h-8 px-2.5 text-[13px] gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-lg",
}
</script>

<template>
  <button
    :type="p.type"
    :disabled="p.disabled || p.cargando"
    :aria-busy="p.cargando || undefined"
    :class="
      cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-colors duration-150 select-none disabled:pointer-events-none disabled:opacity-50',
        VARIANTES[p.variante],
        TAMANOS[p.tamano],
        p.soloIcono && (p.tamano === 'sm' ? 'w-8 px-0!' : p.tamano === 'lg' ? 'w-11 px-0!' : 'w-9 px-0!'),
      )
    "
  >
    <LoaderCircle v-if="p.cargando" class="size-4 animate-spin" aria-hidden="true" />
    <component :is="p.icono" v-else-if="p.icono" class="size-4" aria-hidden="true" />
    <slot />
    <component :is="p.iconoDerecha" v-if="p.iconoDerecha" class="size-4" aria-hidden="true" />
  </button>
</template>

<script setup lang="ts">
import type { Component } from "vue"
import { Esqueleto, Tarjeta, cn } from "@/shared/ui"

defineProps<{
  icono: Component
  etiqueta: string
  valor: string | null
  tono?: "aviso" | "exito"
  enlace?: string
  pequeno?: boolean
}>()
</script>

<template>
  <component
    :is="enlace ? 'RouterLink' : 'div'"
    :to="enlace"
    :class="enlace && 'block rounded-xl focus-visible:outline-2 focus-visible:outline-acento'"
  >
    <Tarjeta :class="cn('h-full transition-colors', enlace && 'hover:border-borde-fuerte')">
      <p class="flex items-center gap-2 text-[12.5px] font-medium text-suave">
        <component
          :is="icono"
          :class="cn('size-4 text-tenue', tono === 'aviso' && 'text-aviso', tono === 'exito' && 'text-exito')"
        />
        {{ etiqueta }}
      </p>
      <Esqueleto v-if="valor === null" class="mt-3 h-8 w-24" />
      <p
        v-else
        :class="
          cn(
            'mt-2 font-semibold tracking-tight tabular-nums',
            pequeno ? 'text-[20px] leading-9' : 'text-[28px] leading-9',
            tono === 'aviso' && 'text-aviso',
          )
        "
      >
        {{ valor }}
      </p>
    </Tarjeta>
  </component>
</template>

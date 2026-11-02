<script setup lang="ts">
import type { Component } from "vue"
import { cn } from "./cn"
defineProps<{
  etiqueta: string
  valor: string | number
  detalle?: string
  tono?: "acento" | "peligro" | "aviso" | "exito"
  icono?: Component
}>()
const COLOR = { acento: "text-acento", peligro: "text-peligro", aviso: "text-aviso", exito: "text-exito" }
</script>

<template>
  <div class="flex flex-col gap-1">
    <span class="flex items-center gap-1.5 text-[12px] font-medium tracking-wide text-tenue uppercase">
      <component :is="icono" v-if="icono" class="size-3.5" />
      {{ etiqueta }}
    </span>
    <span :class="cn('num text-[24px] leading-none font-semibold tracking-tight', tono ? COLOR[tono] : 'text-texto')">
      {{ typeof valor === "number" ? valor.toLocaleString("es-CL") : valor }}
    </span>
    <span v-if="detalle" class="text-[12.5px] text-suave">{{ detalle }}</span>
  </div>
</template>

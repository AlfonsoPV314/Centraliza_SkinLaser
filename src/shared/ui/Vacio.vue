<script setup lang="ts">
import type { Component } from "vue"
defineProps<{ icono?: Component; titulo: string }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-12 text-center">
    <div
      v-if="icono"
      class="mb-4 flex size-12 items-center justify-center rounded-xl border border-borde bg-superficie-2 text-tenue"
    >
      <component :is="icono" class="size-5" />
    </div>
    <p class="font-medium">{{ titulo }}</p>
    <div v-if="$slots.default" class="mt-1 max-w-md text-[13.5px] text-pretty text-suave"><slot /></div>
    <div v-if="$slots.accion" class="mt-5"><slot name="accion" /></div>
  </div>
</template>

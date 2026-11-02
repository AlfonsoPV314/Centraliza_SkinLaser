<script setup lang="ts">
import type { Component } from "vue"
defineProps<{ titulo: string; descripcion?: string; icono?: Component }>()
</script>

<template>
  <div class="mb-4 flex items-start justify-between gap-4">
    <div class="flex min-w-0 items-start gap-3">
      <span
        v-if="icono"
        class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-acento-tenue text-acento"
      >
        <component :is="icono" class="size-4" />
      </span>
      <div class="min-w-0">
        <h2 class="text-[15px] font-semibold tracking-tight">{{ titulo }}</h2>
        <p v-if="descripcion || $slots.descripcion" class="mt-0.5 text-[13px] text-suave">
          <slot name="descripcion">{{ descripcion }}</slot>
        </p>
      </div>
    </div>
    <div v-if="$slots.accion" class="flex shrink-0 items-center gap-2"><slot name="accion" /></div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from "vue"
defineProps<{ titulo: string; descripcion?: string; icono?: Component }>()
</script>

<template>
  <div class="mb-7">
    <div v-if="icono" class="mb-4 flex size-11 items-center justify-center rounded-xl bg-acento-tenue text-acento">
      <component :is="icono" class="size-5" />
    </div>
    <h1 class="text-[26px] leading-tight font-semibold tracking-tight">{{ titulo }}</h1>
    <p v-if="descripcion || $slots.default" class="mt-2 text-[14.5px] leading-relaxed text-suave">
      <slot>{{ descripcion }}</slot>
    </p>
  </div>
</template>

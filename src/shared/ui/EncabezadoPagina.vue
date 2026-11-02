<script setup lang="ts">
defineProps<{ titulo: string; descripcion?: string }>()
</script>

<template>
  <header class="mb-5 flex flex-wrap items-end justify-between gap-4">
    <div class="max-w-3xl min-w-0">
      <div v-if="$slots.migas" class="mb-2 text-[13px] text-tenue"><slot name="migas" /></div>
      <h1 class="text-[22px] leading-tight font-semibold tracking-tight text-balance">{{ titulo }}</h1>
      <p v-if="descripcion || $slots.descripcion" class="mt-1 text-sm text-pretty text-suave">
        <slot name="descripcion">{{ descripcion }}</slot>
      </p>
    </div>
    <div v-if="$slots.acciones" class="flex flex-wrap items-center gap-2"><slot name="acciones" /></div>
  </header>
</template>

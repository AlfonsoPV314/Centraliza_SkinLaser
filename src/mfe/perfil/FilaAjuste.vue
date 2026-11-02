<script setup lang="ts">
defineProps<{ etiqueta: string; detalle: string }>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
    <div class="min-w-0">
      <p class="text-[14px] font-medium">{{ etiqueta }}</p>
      <p class="text-[12.5px] text-tenue">{{ detalle }}</p>
    </div>
    <slot />
  </div>
</template>

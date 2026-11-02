<script setup lang="ts">
import Isotipo from "./Isotipo.vue"
withDefaults(defineProps<{ texto?: string }>(), { texto: "Preparando el sistema…" })
</script>

<template>
  <div class="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4" role="status">
    <Isotipo class="size-10 animate-pulse" />
    <p class="text-sm text-suave">{{ texto }}</p>
  </div>
</template>

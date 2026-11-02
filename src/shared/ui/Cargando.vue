<script setup lang="ts">
import { LoaderCircle } from "@lucide/vue"
withDefaults(defineProps<{ texto?: string }>(), { texto: "Cargando…" })
</script>

<template>
  <div class="flex items-center justify-center gap-2 py-10 text-sm text-suave" role="status">
    <LoaderCircle class="size-4 animate-spin text-acento" aria-hidden="true" />
    {{ texto }}
  </div>
</template>

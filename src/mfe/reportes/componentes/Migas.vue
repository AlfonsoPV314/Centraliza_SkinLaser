<script setup lang="ts">
import { ChevronRight } from "@lucide/vue"

defineProps<{ nombre?: string }>()
</script>

<template>
  <nav aria-label="Ruta" class="flex items-center gap-1">
    <RouterLink to="/reportes" class="hover:text-texto">Reportes</RouterLink>
    <template v-if="nombre">
      <ChevronRight class="size-3.5" aria-hidden="true" />
      <span class="truncate" aria-current="page">{{ nombre }}</span>
    </template>
  </nav>
</template>

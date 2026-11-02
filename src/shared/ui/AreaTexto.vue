<script setup lang="ts">
import { cn } from "./cn"
import { BASE_CONTROL } from "./estilos"

const modelo = defineModel<string>()
defineProps<{ invalido?: boolean }>()
</script>

<template>
  <textarea
    v-model="modelo"
    :class="cn(BASE_CONTROL, 'min-h-20 py-2 leading-relaxed', invalido ? 'border-peligro' : 'border-borde')"
  />
</template>

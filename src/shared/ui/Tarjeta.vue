<script setup lang="ts">
import { cn } from "./cn"
withDefaults(defineProps<{ relleno?: boolean }>(), { relleno: true })
</script>

<template>
  <div :class="cn('rounded-xl border border-borde bg-superficie shadow-panel', relleno && 'p-5')">
    <slot />
  </div>
</template>

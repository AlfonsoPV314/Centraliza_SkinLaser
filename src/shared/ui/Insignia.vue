<script setup lang="ts">
import type { Component } from "vue"
import { cn } from "./cn"
import { TONOS, type Tono } from "./tonos"
withDefaults(defineProps<{ tono?: Tono; icono?: Component }>(), { tono: "neutro" })
</script>

<template>
  <span
    :class="cn('inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11.5px] font-medium whitespace-nowrap', TONOS[tono])"
  >
    <component :is="icono" v-if="icono" class="size-3" />
    <slot />
  </span>
</template>

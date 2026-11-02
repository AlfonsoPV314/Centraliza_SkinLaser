<script setup lang="ts">
import { MARCA } from "@/config/brand"
import { cn } from "@/shared/ui"
import Isotipo from "./Isotipo.vue"
import { estilizar } from "./marca"

defineProps<{ compacta?: boolean; claro?: boolean }>()
</script>

<template>
  <div class="flex items-center gap-2.5">
    <Isotipo :class="claro && 'text-[#52c3c6]'" />
    <div v-if="!compacta" class="leading-none">
      <span
        :class="cn('block font-marca text-[17px] font-semibold tracking-[0.12em] text-acento', claro && 'text-[#52c3c6]')"
      >
        <span aria-hidden="true">{{ estilizar(MARCA.nombreCorto) }}</span>
        <span class="sr-only">{{ MARCA.nombreCorto }}</span>
      </span>
      <p :class="cn('mt-1 text-[10.5px] tracking-wide', claro ? 'text-white/50' : 'text-tenue')">
        Gestión de datos · {{ MARCA.cliente }}
      </p>
    </div>
  </div>
</template>

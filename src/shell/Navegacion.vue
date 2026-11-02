<script setup lang="ts">
import { cn } from "@/shared/ui"
import type { EntradaNavegacion } from "./modulos"
defineProps<{ entradas: EntradaNavegacion[]; pendientes: number }>()
const emit = defineEmits<{ navegar: [] }>()
</script>

<template>
  <nav class="flex flex-col gap-0.5" aria-label="Principal">
    <RouterLink v-for="e in entradas" :key="e.ruta" v-slot="{ href, navigate, isActive, isExactActive }" :to="e.ruta" custom>
      <a
        :href="href"
        :aria-current="(e.exacta ? isExactActive : isActive) ? 'page' : undefined"
        :class="
          cn(
            'group flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
            (e.exacta ? isExactActive : isActive)
              ? 'bg-acento-tenue text-acento'
              : 'text-suave hover:bg-superficie-2 hover:text-texto',
          )
        "
        @click="(navigate($event), emit('navegar'))"
      >
        <component :is="e.icono" class="size-[18px] shrink-0" />
        <span class="flex-1">{{ e.etiqueta }}</span>
        <span
          v-if="e.contador === 'pendientes' && pendientes > 0"
          class="num rounded-full bg-aviso-tenue px-1.5 text-[11px] leading-[18px] font-semibold text-aviso"
        >
          {{ pendientes }}
        </span>
      </a>
    </RouterLink>
  </nav>
</template>

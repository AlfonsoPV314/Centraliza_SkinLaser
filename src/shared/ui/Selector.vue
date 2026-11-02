<script setup lang="ts">
import { ChevronDown } from "@lucide/vue"
import { cn } from "./cn"
import { BASE_CONTROL } from "./estilos"

defineOptions({ inheritAttrs: false })
const modelo = defineModel<string | number | null>()
const p = withDefaults(
  defineProps<{ invalido?: boolean; tamano?: "sm" | "md"; class?: string }>(),
  { tamano: "md" },
)
</script>

<template>
  <div :class="cn('relative', p.class)">
    <select
      v-model="modelo"
      v-bind="$attrs"
      :class="
        cn(
          BASE_CONTROL,
          'appearance-none pr-8',
          p.tamano === 'sm' ? 'h-8 text-[13px]' : 'h-9',
          p.invalido ? 'border-peligro' : 'border-borde',
        )
      "
    >
      <slot />
    </select>
    <ChevronDown
      class="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-tenue"
      aria-hidden="true"
    />
  </div>
</template>

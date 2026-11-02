<script setup lang="ts">
import { ref, type Component } from "vue"
import { cn } from "./cn"
import { BASE_CONTROL } from "./estilos"

defineOptions({ inheritAttrs: false })
const modelo = defineModel<string | number | null>()
const p = defineProps<{ invalido?: boolean; prefijo?: Component; class?: string; tamano?: "sm" | "md" | "lg" }>()
const input = ref<HTMLInputElement>()
defineExpose({ focus: () => input.value?.focus(), el: input })
</script>

<template>
  <div :class="cn('relative flex items-center', p.class)">
    <span v-if="prefijo" class="pointer-events-none absolute left-3 flex text-tenue">
      <component :is="prefijo" class="size-4" />
    </span>
    <input
      ref="input"
      v-model="modelo"
      v-bind="$attrs"
      :aria-invalid="invalido || undefined"
      :class="
        cn(
          BASE_CONTROL,
          p.tamano === 'lg' ? 'h-11' : p.tamano === 'sm' ? 'h-8 text-[13px]' : 'h-9',
          prefijo && 'pl-9',
          $slots.sufijo && 'pr-10',
          invalido ? 'border-peligro' : 'border-borde',
        )
      "
    />
    <span v-if="$slots.sufijo" class="absolute right-1.5 flex"><slot name="sufijo" /></span>
  </div>
</template>

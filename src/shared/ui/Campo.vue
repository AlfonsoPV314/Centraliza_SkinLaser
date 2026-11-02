<script setup lang="ts">
defineProps<{
  etiqueta?: string
  ayuda?: string
  error?: string | null
  opcional?: boolean
  htmlFor?: string
}>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div v-if="etiqueta || $slots.accion" class="flex items-baseline justify-between gap-2">
      <label v-if="etiqueta" :for="htmlFor" class="text-[13px] font-medium text-texto">
        {{ etiqueta }}
        <span v-if="opcional" class="ml-1.5 font-normal text-tenue">(opcional)</span>
      </label>
      <slot name="accion" />
    </div>
    <slot />
    <p v-if="error" class="text-[12.5px] leading-snug text-peligro" role="alert">{{ error }}</p>
    <p v-else-if="ayuda || $slots.ayuda" class="text-[12.5px] leading-snug text-tenue">
      <slot name="ayuda">{{ ayuda }}</slot>
    </p>
  </div>
</template>

<script setup lang="ts">
import { RotateCcw, TriangleAlert } from "@lucide/vue"
import { Boton, Vacio } from "@/shared/ui"
defineProps<{ mensaje: string }>()
const emit = defineEmits<{ reintentar: [] }>()
</script>

<template>
  <div class="flex min-h-screen items-center justify-center p-6">
    <Vacio :icono="TriangleAlert" titulo="No pudimos cargar el sistema">
      {{ mensaje }}
      <template #accion>
        <Boton variante="primario" :icono="RotateCcw" @click="emit('reintentar')">Reintentar</Boton>
      </template>
    </Vacio>
  </div>
</template>

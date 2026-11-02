<script setup lang="ts">
import { RotateCcw, TriangleAlert } from "@lucide/vue"
import { Boton, Vacio } from "@/shared/ui"
const recargar = () => location.reload()
</script>

<template>
  <div class="flex min-h-[70vh] items-center justify-center p-6">
    <Vacio :icono="TriangleAlert" titulo="Esta pantalla tuvo un problema">
      Sus datos están a salvo. Recargue la página; si el problema continúa, avise al equipo de soporte
      indicando qué estaba haciendo.
      <template #accion>
        <div class="flex gap-2">
          <Boton :icono="RotateCcw" @click="recargar">Recargar</Boton>
          <RouterLink to="/"><Boton variante="primario">Ir al inicio</Boton></RouterLink>
        </div>
      </template>
    </Vacio>
  </div>
</template>

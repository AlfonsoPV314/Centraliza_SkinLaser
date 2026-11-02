<script setup lang="ts">
import { Compass } from "@lucide/vue"
import { Boton, Vacio } from "@/shared/ui"
</script>

<template>
  <div class="flex min-h-[70vh] items-center justify-center p-6">
    <Vacio :icono="Compass" titulo="No encontramos esta página">
      Puede que el enlace esté incompleto o que la página haya cambiado de lugar.
      <template #accion>
        <RouterLink to="/"><Boton variante="primario">Ir al inicio</Boton></RouterLink>
      </template>
    </Vacio>
  </div>
</template>

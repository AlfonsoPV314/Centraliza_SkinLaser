<script setup lang="ts">
import { CheckCircle2 } from "@lucide/vue"
import type { Importacion } from "@/contracts"
import { resumenConteos } from "@/shared/presentacion"
import { Boton, Insignia, Tarjeta } from "@/shared/ui"

defineProps<{ imp: Importacion }>()
const emit = defineEmits<{ reiniciar: [] }>()
</script>

<template>
  <Tarjeta class="animar-aparecer mx-auto max-w-xl py-10 text-center">
    <span class="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-exito-tenue text-exito">
      <CheckCircle2 class="size-7" aria-hidden="true" />
    </span>
    <h2 class="text-[20px] font-semibold tracking-tight">Importación guardada</h2>
    <p class="mx-auto mt-2 max-w-md text-[14px] text-suave">{{ resumenConteos(imp.conteos) }}.</p>
    <p class="mt-1 text-[12.5px] text-tenue">
      Si algo salió mal, puede deshacerla desde Datos › Historial<template v-if="imp.originales.length">,
        donde también quedan los archivos originales</template>.
    </p>
    <div
      v-if="imp.conteos.conError > 0 || imp.conteos.pendientes > 0"
      class="mt-5 flex flex-wrap justify-center gap-2"
    >
      <RouterLink v-if="imp.conteos.conError > 0" to="/datos?pestana=errores">
        <Insignia tono="peligro">Corregir {{ imp.conteos.conError }} con error</Insignia>
      </RouterLink>
      <RouterLink v-if="imp.conteos.pendientes > 0" to="/datos?pestana=duplicados">
        <Insignia tono="aviso">Revisar {{ imp.conteos.pendientes }} duplicados</Insignia>
      </RouterLink>
    </div>
    <div class="mt-7 flex flex-wrap justify-center gap-2">
      <Boton @click="emit('reiniciar')">Cargar otras planillas</Boton>
      <RouterLink
        to="/reportes"
        class="inline-flex h-9 items-center rounded-lg bg-acento px-3.5 text-sm font-medium text-sobre-acento shadow-sm hover:bg-acento-fuerte"
      >
        Generar un reporte
      </RouterLink>
    </div>
  </Tarjeta>
</template>

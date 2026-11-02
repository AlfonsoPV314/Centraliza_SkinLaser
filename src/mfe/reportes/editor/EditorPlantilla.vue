<script setup lang="ts">
import { computed } from "vue"
import { useRoute } from "vue-router"
import { mensajeError, useServicios, useUsuario } from "@/application"
import { useCarga } from "@/shared/hooks"
import { Aviso, Boton, EncabezadoPagina, Esqueleto } from "@/shared/ui"
import Migas from "../componentes/Migas.vue"
import FormularioPlantilla from "./FormularioPlantilla.vue"

const route = useRoute()
const s = useServicios()
const { token } = useUsuario()
const id = computed(() => (route.params.id ? String(route.params.id) : null))
const carga = useCarga(async () => {
  const [columnas, plantilla] = await Promise.all([
    s.datos.columnas(token.value),
    id.value ? s.plantillas.obtener(token.value, id.value) : Promise.resolve(null),
  ])
  return { columnas, plantilla }
}, [token, id])
</script>

<template>
  <div v-if="carga.error.value" class="mx-auto max-w-5xl">
    <EncabezadoPagina titulo="Plantilla de reporte">
      <template #migas><Migas /></template>
    </EncabezadoPagina>
    <Aviso tono="peligro" titulo="No se pudo abrir la plantilla">
      {{ mensajeError(carga.error.value) }}
      <template #accion><Boton tamano="sm" @click="carga.recargar()">Reintentar</Boton></template>
    </Aviso>
  </div>
  <div v-else-if="!carga.datos.value" class="mx-auto max-w-5xl space-y-4" aria-busy="true">
    <Esqueleto class="h-10 w-72" />
    <Esqueleto class="h-40" />
    <Esqueleto class="h-72" />
  </div>
  <!-- La clave reinicia el formulario al pasar de «nueva» a «editar» tras crear. -->
  <FormularioPlantilla
    v-else
    :key="carga.datos.value.plantilla?.id ?? 'nueva'"
    :columnas="carga.datos.value.columnas"
    :original="carga.datos.value.plantilla"
  />
</template>

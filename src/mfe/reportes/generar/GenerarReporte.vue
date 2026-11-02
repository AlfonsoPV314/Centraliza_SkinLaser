<script setup lang="ts">
import { computed } from "vue"
import { useRoute } from "vue-router"
import { mensajeError, useServicios, useUsuario } from "@/application"
import { useCarga } from "@/shared/hooks"
import { Aviso, Boton, EncabezadoPagina, Esqueleto } from "@/shared/ui"
import Migas from "../componentes/Migas.vue"
import Generador from "./Generador.vue"

const route = useRoute()
const s = useServicios()
const { token } = useUsuario()
const id = computed(() => String(route.params.id ?? ""))
const carga = useCarga(async () => {
  const [plantilla, columnas, estado] = await Promise.all([
    s.plantillas.obtener(token.value, id.value),
    s.datos.columnas(token.value),
    s.datos.estado(token.value),
  ])
  return { plantilla, columnas, estado }
}, [token, id])
</script>

<template>
  <div v-if="carga.error.value" class="mx-auto max-w-5xl">
    <EncabezadoPagina titulo="Generar reporte">
      <template #migas><Migas /></template>
    </EncabezadoPagina>
    <Aviso tono="peligro" titulo="No se pudo abrir la plantilla">
      {{ mensajeError(carga.error.value) }}
      <template #accion><Boton tamano="sm" @click="carga.recargar()">Reintentar</Boton></template>
    </Aviso>
  </div>
  <div v-else-if="!carga.datos.value" class="mx-auto max-w-6xl space-y-4" aria-busy="true">
    <Esqueleto class="h-10 w-80" />
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Esqueleto class="h-96" />
      <Esqueleto class="h-64" />
    </div>
  </div>
  <Generador
    v-else
    :key="carga.datos.value.plantilla.id"
    :plantilla="carga.datos.value.plantilla"
    :columnas="carga.datos.value.columnas"
    :estado="carga.datos.value.estado"
  />
</template>

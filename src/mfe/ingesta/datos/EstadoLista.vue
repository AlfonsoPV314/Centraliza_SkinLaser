<script setup lang="ts">
import type { Component } from "vue"
import { RefreshCw } from "@lucide/vue"
import { mensajeError } from "@/application"
import { Boton, Esqueleto, Tarjeta, Vacio } from "@/shared/ui"

/** Estados comunes de una lista: cargando, error con reintento o vacía. Muestra el slot cuando hay datos. */
defineProps<{
  cargando: boolean
  error: unknown
  vacia: boolean
  tituloVacio: string
  iconoVacio?: Component
}>()
const emit = defineEmits<{ reintentar: [] }>()
</script>

<template>
  <div v-if="cargando" class="space-y-3" role="status" aria-label="Cargando">
    <Esqueleto v-for="i in 3" :key="i" class="h-24" />
  </div>
  <Tarjeta v-else-if="error">
    <Vacio titulo="No pudimos cargar esta sección">
      {{ mensajeError(error) }}
      <template #accion>
        <Boton :icono="RefreshCw" @click="emit('reintentar')">Reintentar</Boton>
      </template>
    </Vacio>
  </Tarjeta>
  <Tarjeta v-else-if="vacia">
    <Vacio :icono="iconoVacio" :titulo="tituloVacio"><slot name="vacio" /></Vacio>
  </Tarjeta>
  <slot v-else />
</template>

<script setup lang="ts">
import { ShieldAlert } from "@lucide/vue"
import { Boton, Vacio } from "@/shared/ui"
const volver = () => history.back()
</script>

<template>
  <Vacio :icono="ShieldAlert" titulo="Esta sección es solo para administradores">
    Si necesita gestionar usuarios, pida a un administrador del sistema que le asigne ese rol.
    <template #accion>
      <Boton variante="primario" @click="volver">Volver</Boton>
    </template>
  </Vacio>
</template>

<script setup lang="ts">
import { Clock } from "@lucide/vue"
import { useSesion } from "@/application"
import { Boton, Dialogo } from "@/shared/ui"
const sesion = useSesion()
</script>

<template>
  <Dialogo
    :abierto="sesion.estado.aviso !== null"
    :cerrable="false"
    ancho="sm"
    titulo="¿Sigue ahí?"
    @cerrar="sesion.seguirConectado"
  >
    <div class="flex items-center gap-4">
      <div class="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-aviso-tenue text-aviso">
        <Clock class="size-4" />
        <span class="num text-lg leading-none font-semibold">{{ sesion.estado.aviso }}</span>
      </div>
      <p class="text-sm text-suave">
        Por seguridad, su sesión se cerrará en
        <strong class="text-texto">{{ sesion.estado.aviso }} segundos</strong> por inactividad. Lo que no
        haya guardado podría perderse.
      </p>
    </div>
    <template #pie>
      <Boton variante="fantasma" @click="sesion.cerrar('manual')">Cerrar sesión</Boton>
      <Boton variante="primario" data-autofoco @click="sesion.seguirConectado">Seguir conectado</Boton>
    </template>
  </Dialogo>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { Eye, EyeOff } from "@lucide/vue"
import Entrada from "./Entrada.vue"

const modelo = defineModel<string>()
defineProps<{ invalido?: boolean }>()
const visible = ref(false)
</script>

<template>
  <Entrada v-model="modelo" :invalido="invalido" :type="visible ? 'text' : 'password'">
    <template #sufijo>
      <button
        type="button"
        class="flex size-7 items-center justify-center rounded-md text-tenue hover:text-texto"
        :aria-label="visible ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        @click="visible = !visible"
      >
        <EyeOff v-if="visible" class="size-4" />
        <Eye v-else class="size-4" />
      </button>
    </template>
  </Entrada>
</template>

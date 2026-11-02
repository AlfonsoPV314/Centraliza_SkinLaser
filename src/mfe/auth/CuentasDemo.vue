<script setup lang="ts">
import { shallowRef } from "vue"
import { KeyRound } from "@lucide/vue"

interface CuentaDemo {
  correo: string
  contrasena: string
  rol: "administrador" | "usuario"
}
/** Solo prototipo: atajos para entrar con las cuentas de demostración. */
const emit = defineEmits<{ elegir: [c: { correo: string; contrasena: string }] }>()
const cuentas = shallowRef<CuentaDemo[]>([])
import("@/infrastructure/mock").then((m) => (cuentas.value = [...m.CUENTAS_DEMO]))
</script>

<template>
  <div v-if="cuentas.length" class="mt-8 rounded-xl border border-dashed border-borde-fuerte p-4">
    <p class="mb-3 flex items-center gap-2 text-[12.5px] font-medium text-suave">
      <KeyRound class="size-3.5" /> Cuentas de demostración
    </p>
    <div class="grid gap-2 sm:grid-cols-2">
      <button
        v-for="c in cuentas"
        :key="c.correo"
        type="button"
        class="rounded-lg border border-borde bg-superficie px-3 py-2 text-left transition-colors hover:border-acento"
        @click="emit('elegir', c)"
      >
        <span class="block text-[13px] font-medium">{{ c.rol === "administrador" ? "Administrador" : "Usuario" }}</span>
        <span class="block truncate text-[12px] text-tenue">{{ c.correo }}</span>
      </button>
    </div>
  </div>
</template>

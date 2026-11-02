<script setup lang="ts">
import { computed } from "vue"
import { Check, X } from "@lucide/vue"
import { REQUISITOS_CONTRASENA, requisitosContrasena } from "@/domain/password"
import { cn } from "./cn"

const p = defineProps<{ contrasena: string }>()
const r = computed(() => requisitosContrasena(p.contrasena))
</script>

<template>
  <ul class="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2" aria-label="Requisitos de la contraseña">
    <li
      v-for="q in REQUISITOS_CONTRASENA"
      :key="q.clave"
      :class="cn('flex items-center gap-1.5 text-[12.5px] transition-colors', r[q.clave] ? 'text-exito' : 'text-tenue')"
    >
      <Check v-if="r[q.clave]" class="size-3.5" :stroke-width="2.5" />
      <X v-else class="size-3.5" />
      {{ q.texto }}
    </li>
  </ul>
</template>

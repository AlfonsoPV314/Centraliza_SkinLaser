<script setup lang="ts">
import { computed, ref } from "vue"
import { CheckCircle2, Search } from "@lucide/vue"
import { useServicios, useUsuario } from "@/application"
import type { ColumnaCatalogo } from "@/domain/model"
import { useCarga } from "@/shared/hooks"
import { Entrada, Tarjeta, Vacio } from "@/shared/ui"
import EstadoLista from "./EstadoLista.vue"
import FilaPaciente from "./FilaPaciente.vue"

defineProps<{ catalogo: ColumnaCatalogo[] | null }>()
const s = useServicios()
const { token } = useUsuario()
const lista = useCarga(() => s.datos.pacientesIncompletos(token.value), [token])
const q = ref("")
const visibles = computed(() => {
  const nq = q.value.trim().toLowerCase()
  return (lista.datos.value ?? []).filter(
    (p) => !nq || `${p.doc} ${p.campos.nombre_completo?.o ?? ""}`.toLowerCase().includes(nq),
  )
})
</script>

<template>
  <EstadoLista
    :cargando="lista.cargando.value && !lista.datos.value"
    :error="lista.error.value"
    :vacia="!lista.datos.value?.length"
    titulo-vacio="Todos los pacientes tienen sus datos base completos"
    :icono-vacio="CheckCircle2"
    @reintentar="lista.recargar()"
  >
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-[13.5px] text-suave">
          {{ lista.datos.value?.length }}
          {{ lista.datos.value?.length === 1 ? "paciente tiene" : "pacientes tienen" }}
          datos base vacíos. Complételos para que los reportes sean precisos.
        </p>
        <Entrada
          v-model="q"
          class="max-w-xs"
          :prefijo="Search"
          placeholder="Buscar paciente"
          aria-label="Buscar paciente"
        />
      </div>
      <Tarjeta :relleno="false" class="divide-y divide-borde overflow-hidden">
        <FilaPaciente
          v-for="p in visibles.slice(0, 100)"
          :key="p.doc"
          :paciente="p"
          :catalogo="catalogo"
          @guardado="lista.recargar(true)"
        />
        <Vacio v-if="!visibles.length" titulo="Ningún paciente coincide" />
      </Tarjeta>
      <p v-if="visibles.length > 100" class="text-center text-[12.5px] text-tenue">
        Se muestran los primeros 100. Use la búsqueda para encontrar otros.
      </p>
    </div>
  </EstadoLista>
</template>

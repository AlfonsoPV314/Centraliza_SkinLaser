<script setup lang="ts">
import { CheckCircle2 } from "@lucide/vue"
import { avisarCambioDatos, useServicios, useUsuario } from "@/application"
import type { ColumnaCatalogo } from "@/domain/model"
import { useCarga } from "@/shared/hooks"
import { Aviso } from "@/shared/ui"
import EstadoLista from "./EstadoLista.vue"
import TarjetaDuplicado from "./TarjetaDuplicado.vue"

defineProps<{ catalogo: ColumnaCatalogo[] | null }>()
const s = useServicios()
const { token } = useUsuario()
const lista = useCarga(() => s.datos.duplicadosPendientes(token.value), [token])
function quitar(id: string) {
  lista.datos.value = lista.datos.value?.filter((x) => x.id !== id) ?? null
  avisarCambioDatos()
}
</script>

<template>
  <EstadoLista
    :cargando="lista.cargando.value && !lista.datos.value"
    :error="lista.error.value"
    :vacia="!lista.datos.value?.length"
    titulo-vacio="No hay duplicados pendientes"
    :icono-vacio="CheckCircle2"
    @reintentar="lista.recargar()"
  >
    <template #vacio>
      Cuando una fila coincida con otra ya guardada y elija decidir después, aparecerá aquí.
    </template>
    <div class="space-y-4">
      <Aviso tono="info">
        Dos filas son duplicadas cuando tienen el mismo paciente (o N° de atención) y la misma fecha y hora de
        registro. Conserve una, guarde ambas o combine celda por celda.
      </Aviso>
      <TarjetaDuplicado
        v-for="d in lista.datos.value"
        :key="d.id"
        :dup="d"
        :catalogo="catalogo"
        @resuelto="quitar(d.id)"
      />
    </div>
  </EstadoLista>
</template>

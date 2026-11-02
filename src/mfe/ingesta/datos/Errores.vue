<script setup lang="ts">
import { ref } from "vue"
import { CheckCircle2 } from "@lucide/vue"
import { avisarCambioDatos, useInformarError, useServicios, useUsuario, useNotificar } from "@/application"
import type { FilaConError } from "@/contracts"
import type { ColumnaCatalogo, FilaProcesada } from "@/domain/model"
import { useCarga } from "@/shared/hooks"
import { tiempoRelativo } from "@/shared/presentacion"
import { Aviso } from "@/shared/ui"
import CorreccionFila from "../componentes/CorreccionFila.vue"
import EstadoLista from "./EstadoLista.vue"

defineProps<{ catalogo: ColumnaCatalogo[] | null }>()
const s = useServicios()
const { token } = useUsuario()
const notificar = useNotificar()
const informar = useInformarError()
const lista = useCarga(() => s.datos.filasConError(token.value), [token])
const ocupado = ref<Record<string, "guardar" | "descartar">>({})

function quitar(id: string) {
  lista.datos.value = lista.datos.value?.filter((x) => x.id !== id) ?? null
  avisarCambioDatos()
}
function marcar(id: string, v: "guardar" | "descartar" | null) {
  const { [id]: _, ...resto } = ocupado.value
  ocupado.value = v ? { ...resto, [id]: v } : resto
}

async function guardar(r: FilaConError, fila: FilaProcesada) {
  marcar(r.id, "guardar")
  try {
    const res = await s.datos.corregirFila(token.value, r.id, fila)
    notificar(
      res === "guardada"
        ? { tono: "exito", titulo: "Fila guardada" }
        : {
            tono: "info",
            titulo: "La fila coincide con un registro existente",
            detalle: "Quedó en Duplicados para que decida cuál conservar.",
          },
    )
    quitar(r.id)
  } catch (e) {
    informar(e, "No se pudo guardar la fila")
  } finally {
    marcar(r.id, null)
  }
}
async function descartar(r: FilaConError) {
  marcar(r.id, "descartar")
  try {
    await s.datos.descartarFilaConError(token.value, r.id)
    notificar({ tono: "info", titulo: "Fila descartada" })
    quitar(r.id)
  } catch (e) {
    informar(e)
  } finally {
    marcar(r.id, null)
  }
}
</script>

<template>
  <EstadoLista
    :cargando="lista.cargando.value && !lista.datos.value"
    :error="lista.error.value"
    :vacia="!lista.datos.value?.length"
    titulo-vacio="No hay filas con errores"
    :icono-vacio="CheckCircle2"
    @reintentar="lista.recargar()"
  >
    <template #vacio>Todas las filas cargadas pasaron las validaciones.</template>
    <div class="space-y-4">
      <Aviso tono="info">
        Estas filas no se guardaron. Corrija los campos marcados y revíselas otra vez, o descártelas si no
        corresponden.
      </Aviso>
      <CorreccionFila
        v-for="r in lista.datos.value"
        :key="r.id"
        :fila="r.fila"
        :catalogo="catalogo"
        :contexto="tiempoRelativo(r.creadaEn)"
        :ocupado="ocupado[r.id] ?? null"
        @guardar="guardar(r, $event)"
        @descartar="descartar(r)"
      />
    </div>
  </EstadoLista>
</template>

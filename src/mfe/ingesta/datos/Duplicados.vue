<script setup lang="ts">
import { computed, ref } from "vue"
import { CheckCircle2, Copy, FilePen, History, Sparkles } from "@lucide/vue"
import { avisarCambioDatos, useInformarError, useNotificar, useServicios, useUsuario } from "@/application"
import type { DuplicadoPendiente } from "@/contracts"
import { actualizarDatos } from "@/domain/masivo"
import type { ColumnaCatalogo } from "@/domain/model"
import { tieneErrores } from "@/domain/rules"
import { useCarga } from "@/shared/hooks"
import { Aviso, Boton, Casilla } from "@/shared/ui"
import { tiposExtraDe } from "../valores"
import BarraSeleccion from "./BarraSeleccion.vue"
import EstadoLista from "./EstadoLista.vue"
import TarjetaDuplicado from "./TarjetaDuplicado.vue"

type AccionLote = "guardar_ambas" | "conservar_nueva" | "conservar_anterior" | "actualizar"
const TITULOS: Record<AccionLote, string> = {
  guardar_ambas: "Se guardaron ambas versiones",
  conservar_nueva: "Se usó la versión nueva",
  conservar_anterior: "Se conservó la versión guardada",
  actualizar: "Se actualizaron los datos guardados",
}

const p = defineProps<{ catalogo: ColumnaCatalogo[] | null }>()
const s = useServicios()
const { token } = useUsuario()
const notificar = useNotificar()
const informar = useInformarError()
const lista = useCarga(() => s.datos.duplicadosPendientes(token.value), [token])
const seleccion = ref(new Set<string>())
const enLote = ref<AccionLote | null>(null)
const dups = computed(() => lista.datos.value ?? [])

function quitar(id: string) {
  lista.datos.value = lista.datos.value?.filter((x) => x.id !== id) ?? null
  const n = new Set(seleccion.value)
  n.delete(id)
  seleccion.value = n
  avisarCambioDatos()
}
function alternar(id: string, si: boolean) {
  const n = new Set(seleccion.value)
  if (si) n.add(id)
  else n.delete(id)
  seleccion.value = n
}
const todas = (si: boolean) => (seleccion.value = new Set(si ? dups.value.map((d) => d.id) : []))

async function resolver(d: DuplicadoPendiente, accion: AccionLote): Promise<"ok" | "invalida"> {
  if (accion !== "actualizar") {
    await s.datos.resolverDuplicado(token.value, d.id, accion)
    return "ok"
  }
  const r = actualizarDatos(d.existente, d.nueva, tiposExtraDe(p.catalogo))
  if (tieneErrores(r.fila)) return "invalida"
  await s.datos.resolverDuplicado(token.value, d.id, "combinar", r)
  return "ok"
}

async function aplicar(accion: AccionLote) {
  enLote.value = accion
  const elegidos = dups.value.filter((d) => seleccion.value.has(d.id))
  let ok = 0
  let invalidas = 0
  let fallidas = 0
  for (const d of elegidos) {
    try {
      if ((await resolver(d, accion)) === "ok") {
        ok++
        quitar(d.id)
      } else invalidas++
    } catch (e) {
      fallidas++
      if (fallidas === 1) informar(e, "No se pudo resolver uno de los duplicados")
    }
  }
  enLote.value = null
  const partes = [
    `${ok} ${ok === 1 ? "duplicado resuelto" : "duplicados resueltos"}`,
    invalidas && `${invalidas} quedaron pendientes porque la combinación no pasa las validaciones`,
    fallidas && `${fallidas} con error`,
  ].filter(Boolean)
  notificar({ tono: invalidas || fallidas ? "info" : "exito", titulo: TITULOS[accion], detalle: partes.join(" · ") })
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
        registro. Resuélvalas una a una o seleccione varias. <strong>Actualizar datos</strong> conserva lo
        guardado y reemplaza solo las celdas que vienen con valor en la planilla nueva.
      </Aviso>
      <BarraSeleccion :total="dups.length" :seleccionadas="seleccion.size" :ocupado="!!enLote" @todas="todas">
        <Boton tamano="sm" variante="primario" :icono="Sparkles" :cargando="enLote === 'actualizar'" :disabled="!!enLote" @click="aplicar('actualizar')">
          Actualizar datos
        </Boton>
        <Boton tamano="sm" :icono="FilePen" :cargando="enLote === 'conservar_nueva'" :disabled="!!enLote" @click="aplicar('conservar_nueva')">
          Usar la nueva
        </Boton>
        <Boton tamano="sm" :icono="History" :cargando="enLote === 'conservar_anterior'" :disabled="!!enLote" @click="aplicar('conservar_anterior')">
          Conservar la guardada
        </Boton>
        <Boton tamano="sm" :icono="Copy" :cargando="enLote === 'guardar_ambas'" :disabled="!!enLote" @click="aplicar('guardar_ambas')">
          Guardar ambas
        </Boton>
      </BarraSeleccion>
      <div v-for="d in dups" :key="d.id" class="flex items-start gap-3">
        <Casilla class="mt-5" :model-value="seleccion.has(d.id)" :deshabilitada="!!enLote" @update:model-value="alternar(d.id, $event)">
          <span class="sr-only">Seleccionar duplicado de la fila {{ d.nueva.numero }} de {{ d.nueva.archivo }}</span>
        </Casilla>
        <TarjetaDuplicado class="min-w-0 flex-1" :dup="d" :catalogo="catalogo" @resuelto="quitar(d.id)" />
      </div>
    </div>
  </EstadoLista>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { CheckCircle2, IdCard, Trash2 } from "@lucide/vue"
import { avisarCambioDatos, useInformarError, useServicios, useUsuario, useNotificar } from "@/application"
import type { FilaConError } from "@/contracts"
import { errorDeDocumento, marcarPasaporte } from "@/domain/masivo"
import type { ColumnaCatalogo, FilaProcesada } from "@/domain/model"
import { tieneErrores } from "@/domain/rules"
import { useCarga } from "@/shared/hooks"
import { tiempoRelativo } from "@/shared/presentacion"
import { Aviso, Boton, Casilla } from "@/shared/ui"
import CorreccionFila from "../componentes/CorreccionFila.vue"
import { tiposExtraDe } from "../valores"
import BarraSeleccion from "./BarraSeleccion.vue"
import ConfirmarEliminacion from "./ConfirmarEliminacion.vue"
import EstadoLista from "./EstadoLista.vue"

const p = defineProps<{ catalogo: ColumnaCatalogo[] | null }>()
const s = useServicios()
const { token } = useUsuario()
const notificar = useNotificar()
const informar = useInformarError()
const lista = useCarga(() => s.datos.filasConError(token.value), [token])
const ocupado = ref<Record<string, "guardar" | "descartar">>({})

function quitar(id: string) {
  lista.datos.value = lista.datos.value?.filter((x) => x.id !== id) ?? null
  const n = new Set(seleccion.value)
  n.delete(id)
  seleccion.value = n
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

// Selección múltiple
const seleccion = ref(new Set<string>())
const filas = computed(() => lista.datos.value ?? [])
const elegidas = computed(() => filas.value.filter((r) => seleccion.value.has(r.id)))
const conErrorDoc = computed(() => elegidas.value.filter((r) => errorDeDocumento(r.fila)))
const enLote = ref(false)
function alternar(id: string, si: boolean) {
  const n = new Set(seleccion.value)
  if (si) n.add(id)
  else n.delete(id)
  seleccion.value = n
}
const todas = (si: boolean) => (seleccion.value = new Set(si ? filas.value.map((r) => r.id) : []))
const seleccionarDocumento = () => (seleccion.value = new Set(filas.value.filter((r) => errorDeDocumento(r.fila)).map((r) => r.id)))
const totalErrorDoc = computed(() => filas.value.filter((r) => errorDeDocumento(r.fila)).length)

async function pasaportesEnLote() {
  enLote.value = true
  const tipos = tiposExtraDe(p.catalogo)
  let guardadas = 0
  let duplicadas = 0
  let siguen = 0
  let fallidas = 0
  for (const r of conErrorDoc.value) {
    const fila = marcarPasaporte(r.fila, tipos)
    if (tieneErrores(fila)) {
      // Aún tiene otros errores: se actualiza en pantalla para corregirlos a mano.
      siguen++
      lista.datos.value = filas.value.map((x) => (x.id === r.id ? { ...x, fila } : x))
      continue
    }
    try {
      const res = await s.datos.corregirFila(token.value, r.id, fila)
      res === "guardada" ? guardadas++ : duplicadas++
      quitar(r.id)
    } catch {
      fallidas++
    }
  }
  enLote.value = false
  const partes = [
    guardadas && `${guardadas} guardadas`,
    duplicadas && `${duplicadas} enviadas a Duplicados`,
    siguen && `${siguen} siguen con otros errores`,
    fallidas && `${fallidas} no se pudieron guardar`,
  ].filter(Boolean)
  notificar({
    tono: fallidas || siguen ? "info" : "exito",
    titulo: "Documentos marcados como pasaporte extranjero",
    detalle: partes.join(" · "),
  })
}

const confirmandoDescarte = ref(false)
async function descartarEnLote() {
  enLote.value = true
  let ok = 0
  for (const r of elegidas.value) {
    try {
      await s.datos.descartarFilaConError(token.value, r.id)
      quitar(r.id)
      ok++
    } catch (e) {
      informar(e)
      break
    }
  }
  enLote.value = false
  confirmandoDescarte.value = false
  notificar({ tono: "info", titulo: `${ok} ${ok === 1 ? "fila descartada" : "filas descartadas"}` })
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
        corresponden. Marque varias para corregirlas o descartarlas juntas.
      </Aviso>
      <BarraSeleccion :total="filas.length" :seleccionadas="seleccion.size" :ocupado="enLote" @todas="todas">
        <Boton
          tamano="sm"
          :icono="IdCard"
          :cargando="enLote"
          :disabled="!conErrorDoc.length"
          :title="conErrorDoc.length ? undefined : 'Ninguna fila seleccionada tiene un error de RUN'"
          @click="pasaportesEnLote"
        >
          Marcar {{ conErrorDoc.length || "" }} como pasaporte extranjero
        </Boton>
        <Boton tamano="sm" variante="peligro" :icono="Trash2" :disabled="enLote" @click="confirmandoDescarte = true">
          Descartar
        </Boton>
      </BarraSeleccion>
      <p v-if="totalErrorDoc > 1 && !seleccion.size" class="-mt-2 text-[12.5px] text-tenue">
        {{ totalErrorDoc }} filas tienen un RUN no válido.
        <Boton tamano="sm" variante="enlace" @click="seleccionarDocumento">Seleccionarlas</Boton>
      </p>
      <div v-for="r in filas" :key="r.id" class="flex items-start gap-3">
        <Casilla class="mt-5" :model-value="seleccion.has(r.id)" :deshabilitada="enLote" @update:model-value="alternar(r.id, $event)">
          <span class="sr-only">Seleccionar fila {{ r.fila.numero }} de {{ r.fila.archivo }}</span>
        </Casilla>
        <CorreccionFila
          :key="r.fila.uid + (r.fila.forzarPasaporte ? '-p' : '')"
          class="min-w-0 flex-1"
          :fila="r.fila"
          :catalogo="catalogo"
          :contexto="tiempoRelativo(r.creadaEn)"
          :ocupado="ocupado[r.id] ?? null"
          @guardar="guardar(r, $event)"
          @descartar="descartar(r)"
        />
      </div>
    </div>
  </EstadoLista>
  <ConfirmarEliminacion
    :abierto="confirmandoDescarte"
    :titulo="`¿Descartar ${seleccion.size} ${seleccion.size === 1 ? 'fila' : 'filas'} con errores?`"
    :eliminando="enLote"
    accion="Descartar"
    @cerrar="confirmandoDescarte = false"
    @confirmar="descartarEnLote"
  >
    <p>Las filas seleccionadas no se guardarán.</p>
  </ConfirmarEliminacion>
</template>

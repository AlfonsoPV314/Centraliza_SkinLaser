<script setup lang="ts">
// Buscar y eliminar columnas guardadas (con todos sus valores). Las columnas estructurales están protegidas.
import { computed, ref, shallowRef, watch } from "vue"
import { Lock, Search, Trash2 } from "@lucide/vue"
import { avisarCambioDatos, useInformarError, useNotificar, useServicios, useUsuario } from "@/application"
import { COLUMNAS_PROTEGIDAS } from "@/contracts/datos"
import type { ColumnaCatalogo } from "@/domain/model"
import { normalizarTexto } from "@/domain/text"
import { Boton, Dialogo, Entrada, Esqueleto, Insignia, Segmentado } from "@/shared/ui"
import ConfirmarEliminacion from "./ConfirmarEliminacion.vue"

const p = defineProps<{ abierto: boolean; catalogo: ColumnaCatalogo[] }>()
const emit = defineEmits<{ cerrar: []; eliminada: [clave: string] }>()
const s = useServicios()
const { token } = useUsuario()
const informar = useInformarError()
const notificar = useNotificar()

const q = ref("")
const origen = ref<"todas" | "extra" | "conocida">("todas")
const uso = shallowRef<Record<string, number> | null>(null)
const aEliminar = shallowRef<ColumnaCatalogo | null>(null)
const eliminando = ref(false)

watch(
  () => p.abierto,
  async (a) => {
    if (!a) return
    q.value = ""
    uso.value = null
    try {
      uso.value = await s.datos.usoColumnas(token.value)
    } catch (e) {
      informar(e, "No se pudo contar el uso de las columnas")
      uso.value = {}
    }
  },
  { immediate: true },
)

const protegida = (c: ColumnaCatalogo) => (COLUMNAS_PROTEGIDAS as readonly string[]).includes(c.clave)
const filtradas = computed(() => {
  const n = normalizarTexto(q.value).trim()
  return p.catalogo
    .filter((c) => origen.value === "todas" || c.origen === origen.value)
    .filter((c) => !n || normalizarTexto(`${c.etiqueta} ${c.clave}`).includes(n))
    .sort((a, b) => (uso.value?.[b.clave] ?? 0) - (uso.value?.[a.clave] ?? 0) || a.etiqueta.localeCompare(b.etiqueta, "es"))
})
const filasDe = (c: ColumnaCatalogo) => uso.value?.[c.clave] ?? 0

async function eliminar() {
  const c = aEliminar.value
  if (!c) return
  eliminando.value = true
  try {
    const r = await s.datos.eliminarColumna(token.value, c.clave)
    notificar({
      tono: "exito",
      titulo: `Columna «${c.etiqueta}» eliminada`,
      detalle: `Se borraron sus valores en ${r.filas.toLocaleString("es-CL")} ${r.filas === 1 ? "fila" : "filas"}.`,
    })
    if (uso.value) uso.value = { ...uso.value, [c.clave]: 0 }
    aEliminar.value = null
    avisarCambioDatos()
    emit("eliminada", c.clave)
  } catch (e) {
    informar(e, "No se pudo eliminar la columna")
  } finally {
    eliminando.value = false
  }
}
</script>

<template>
  <Dialogo
    :abierto="abierto && !aEliminar"
    ancho="lg"
    titulo="Administrar columnas"
    descripcion="Busque una columna para eliminarla junto con todos sus valores guardados."
    @cerrar="emit('cerrar')"
  >
    <div class="flex flex-wrap items-center gap-2">
      <Entrada v-model="q" class="min-w-56 flex-1" :prefijo="Search" placeholder="Buscar columna" aria-label="Buscar columna" />
      <Segmentado
        v-model="origen"
        tamano="sm"
        etiqueta="Origen de la columna"
        :opciones="[
          { valor: 'todas', etiqueta: 'Todas' },
          { valor: 'extra', etiqueta: 'Adicionales' },
          { valor: 'conocida', etiqueta: 'Del sistema' },
        ]"
      />
    </div>
    <div class="mt-3 max-h-[55vh] overflow-y-auto rounded-lg border border-borde">
      <div v-if="!uso" class="space-y-2 p-3" role="status"><Esqueleto v-for="i in 5" :key="i" class="h-9" /></div>
      <table v-else class="w-full text-left text-[13px]">
        <thead class="sticky top-0 bg-superficie-2 text-[12px] text-tenue">
          <tr>
            <th scope="col" class="px-3 py-2 font-medium">Columna</th>
            <th scope="col" class="px-3 py-2 text-right font-medium">Filas con valor</th>
            <th scope="col" class="w-12 px-3 py-2"><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-borde">
          <tr v-for="c in filtradas" :key="c.clave">
            <td class="px-3 py-2">
              <span class="font-medium">{{ c.etiqueta }}</span>
              <Insignia v-if="c.origen === 'extra'" class="ml-2">Adicional</Insignia>
            </td>
            <td class="num px-3 py-2 text-right text-suave">{{ filasDe(c).toLocaleString("es-CL") }}</td>
            <td class="px-3 py-1.5 text-right">
              <span v-if="protegida(c)" class="inline-flex size-8 items-center justify-center text-tenue" title="Columna protegida: identifica o fecha cada registro">
                <Lock class="size-3.5" aria-label="Protegida" />
              </span>
              <Boton
                v-else
                tamano="sm"
                variante="fantasma"
                solo-icono
                :icono="Trash2"
                :aria-label="`Eliminar la columna «${c.etiqueta}»`"
                @click="aEliminar = c"
              />
            </td>
          </tr>
          <tr v-if="!filtradas.length">
            <td colspan="3" class="px-3 py-6 text-center text-tenue">Ninguna columna coincide.</td>
          </tr>
        </tbody>
      </table>
    </div>
    <template #pie>
      <Boton @click="emit('cerrar')">Cerrar</Boton>
    </template>
  </Dialogo>

  <ConfirmarEliminacion
    :abierto="!!aEliminar"
    :titulo="`¿Eliminar la columna «${aEliminar?.etiqueta}»?`"
    :eliminando="eliminando"
    accion="Eliminar columna"
    @cerrar="aEliminar = null"
    @confirmar="eliminar"
  >
    <p v-if="aEliminar">
      Se borrarán sus valores en
      <strong>{{ filasDe(aEliminar).toLocaleString("es-CL") }} {{ filasDe(aEliminar) === 1 ? "fila" : "filas" }}</strong>
      y en las fichas de pacientes.
      <template v-if="aEliminar.origen === 'extra'"> La columna también desaparecerá del catálogo.</template>
      Las plantillas de reporte que la usen la mostrarán como «no disponible».
    </p>
  </ConfirmarEliminacion>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue"
import { Columns3, Database, Filter, Search, Settings2, Trash2, X } from "@lucide/vue"
import { avisarCambioDatos, mensajeError, useSesion, useCambiosDatos, useInformarError, useNotificar, useServicios, useUsuario } from "@/application"
import type { SeleccionFilas } from "@/contracts/datos"
import { contarCondiciones, grupoVacio, type Grupo } from "@/domain/filters"
import type { ColumnaCatalogo, FilaGuardada } from "@/domain/model"
import { useCarga, useRetardo } from "@/shared/hooks"
import { tiempoRelativo } from "@/shared/presentacion"
import { Boton, Casilla, Dialogo, Entrada, Esqueleto, Paginacion, Tarjeta, Vacio, cn } from "@/shared/ui"
import EditorFiltros from "@/mfe/reportes/componentes/EditorFiltros.vue"
import { etiquetaDe, mostrarValor, tipoDe } from "../valores"
import AdministrarColumnas from "./AdministrarColumnas.vue"
import ConfirmarEliminacion from "./ConfirmarEliminacion.vue"
import ElegirColumnas from "./ElegirColumnas.vue"
import {
  PREDETERMINADAS,
  alineadaDerecha,
  columnasDisponibles,
  guardarVisibles,
  leerVisibles,
  valorCelda,
} from "./columnasTabla"

const p = defineProps<{ catalogo: ColumnaCatalogo[] | null }>()
const s = useServicios()
const { token, usuario } = useUsuario()
const informar = useInformarError()
const notificar = useNotificar()
const sesion = useSesion()

// Búsqueda y filtros
const q = ref("")
const pagina = ref(1)
const busqueda = useRetardo(q)
const filtros = ref<Grupo>(grupoVacio())
const verFiltros = ref(false)
const nFiltros = computed(() => contarCondiciones(filtros.value))
// Clave estable de los filtros: solo cambia cuando cambia una condición completa.
const claveFiltros = computed(() => JSON.stringify(filtros.value))
const filtrosAplicados = useRetardo(claveFiltros)
const filtrosActivos = (): Grupo | null => (nFiltros.value ? (JSON.parse(filtrosAplicados.value) as Grupo) : null)
const porPagina = () => usuario.value.preferencias.porPagina
const lista = useCarga(
  () => s.datos.listarFilas(token.value, busqueda.value, { pagina: pagina.value, porPagina: porPagina() }, filtrosActivos()),
  [token, busqueda, pagina, porPagina, filtrosAplicados],
)
watch([busqueda, filtrosAplicados], () => {
  pagina.value = 1
  limpiarSeleccion()
})
useCambiosDatos(() => lista.recargar(true))
const hayBusqueda = computed(() => !!q.value.trim() || nFiltros.value > 0)
function limpiarBusqueda() {
  q.value = ""
  filtros.value = grupoVacio()
}

// Columnas visibles
const disponibles = computed(() => columnasDisponibles(p.catalogo ?? []))
const visibles = ref<string[]>(leerVisibles())
watch(visibles, guardarVisibles)
const columnas = computed(() => {
  const m = new Map(disponibles.value.map((c) => [c.clave, c]))
  return visibles.value.map((c) => m.get(c)).filter((c) => !!c)
})
const eligiendoColumnas = ref(false)
const administrandoColumnas = ref(false)
const quitarColumnaVisible = (clave: string) => (visibles.value = visibles.value.filter((c) => c !== clave))

// Selección
const seleccion = ref(new Set<string>())
const todasLasCoincidentes = ref(false)
const itemsPagina = computed(() => lista.datos.value?.items ?? [])
const total = computed(() => lista.datos.value?.total ?? 0)
const paginaMarcada = computed(() => itemsPagina.value.length > 0 && itemsPagina.value.every((f) => seleccion.value.has(f.id)))
const paginaParcial = computed(() => !paginaMarcada.value && itemsPagina.value.some((f) => seleccion.value.has(f.id)))
const cantidadSeleccionada = computed(() => (todasLasCoincidentes.value ? total.value : seleccion.value.size))
function limpiarSeleccion() {
  seleccion.value = new Set()
  todasLasCoincidentes.value = false
}
function marcar(id: string, si: boolean) {
  const n = new Set(seleccion.value)
  if (si) n.add(id)
  else n.delete(id)
  seleccion.value = n
  todasLasCoincidentes.value = false
}
function marcarPagina(si: boolean) {
  const n = new Set(seleccion.value)
  for (const f of itemsPagina.value) si ? n.add(f.id) : n.delete(f.id)
  seleccion.value = n
  todasLasCoincidentes.value = false
}

// Eliminación
const confirmando = ref(false)
const eliminando = ref(false)
async function eliminar() {
  const sel: SeleccionFilas = todasLasCoincidentes.value
    ? { busqueda: { q: busqueda.value, filtros: filtrosActivos() } }
    : { ids: [...seleccion.value] }
  eliminando.value = true
  try {
    const n = await s.datos.eliminarFilas(token.value, sel)
    notificar({ tono: "exito", titulo: `${n.toLocaleString("es-CL")} ${n === 1 ? "fila eliminada" : "filas eliminadas"}` })
    confirmando.value = false
    limpiarSeleccion()
    avisarCambioDatos()
  } catch (e) {
    informar(e, "No se pudieron eliminar las filas")
  } finally {
    eliminando.value = false
  }
}

const detalle = shallowRef<FilaGuardada | null>(null)
function eliminarDetalle() {
  if (!detalle.value) return
  seleccion.value = new Set([detalle.value.id])
  todasLasCoincidentes.value = false
  detalle.value = null
  confirmando.value = true
}
const etiquetaFiltro = (c: string) => p.catalogo?.find((x) => x.clave === c)?.etiqueta ?? c
</script>

<template>
  <div class="mb-4 flex flex-wrap items-center gap-2">
    <Entrada
      v-model="q"
      class="min-w-60 flex-1 sm:max-w-md"
      placeholder="Buscar en cualquier columna"
      aria-label="Buscar registros"
      :prefijo="Search"
    />
    <Boton :icono="Filter" :aria-expanded="verFiltros" aria-controls="filtros-registros" @click="verFiltros = !verFiltros">
      Filtros<span v-if="nFiltros" class="rounded-full bg-acento px-1.5 text-[11px] font-semibold text-sobre-acento">{{ nFiltros }}</span>
    </Boton>
    <Boton :icono="Columns3" @click="eligiendoColumnas = true">Columnas</Boton>
    <Boton v-if="sesion.esAdmin.value" variante="fantasma" :icono="Settings2" @click="administrandoColumnas = true">Administrar columnas</Boton>
  </div>

  <Tarjeta v-if="verFiltros" id="filtros-registros" class="mb-4">
    <div class="mb-3 flex items-center justify-between gap-3">
      <p class="text-[14px] font-semibold">Filtrar por columnas</p>
      <Boton v-if="nFiltros" tamano="sm" variante="fantasma" :icono="X" @click="filtros = grupoVacio()">Quitar filtros</Boton>
    </div>
    <EditorFiltros v-if="catalogo" v-model="filtros" :columnas="catalogo" />
  </Tarjeta>

  <div
    v-if="cantidadSeleccionada > 0"
    class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-acento/40 bg-acento-tenue px-4 py-2.5 text-[13.5px]"
    role="status"
  >
    <p class="font-medium">
      {{ cantidadSeleccionada.toLocaleString("es-CL") }}
      {{ cantidadSeleccionada === 1 ? "fila seleccionada" : "filas seleccionadas" }}
    </p>
    <Boton
      v-if="paginaMarcada && !todasLasCoincidentes && total > seleccion.size"
      tamano="sm"
      variante="enlace"
      @click="todasLasCoincidentes = true"
    >
      Seleccionar las {{ total.toLocaleString("es-CL") }} {{ hayBusqueda ? "que coinciden" : "filas guardadas" }}
    </Boton>
    <Boton tamano="sm" variante="enlace" @click="limpiarSeleccion">Quitar selección</Boton>
    <Boton class="ml-auto" tamano="sm" variante="peligro" :icono="Trash2" @click="confirmando = true">Eliminar</Boton>
  </div>

  <Tarjeta :relleno="false" class="overflow-hidden">
    <div v-if="lista.cargando.value && !lista.datos.value" class="space-y-2 p-4" role="status">
      <Esqueleto v-for="i in 5" :key="i" class="h-10" />
    </div>
    <Vacio v-else-if="lista.error.value" titulo="No pudimos cargar los registros">
      {{ mensajeError(lista.error.value) }}
      <template #accion><Boton @click="lista.recargar()">Reintentar</Boton></template>
    </Vacio>
    <Vacio
      v-else-if="!lista.datos.value?.items.length"
      :icono="Database"
      :titulo="hayBusqueda ? 'Ningún registro coincide' : 'Aún no hay datos guardados'"
    >
      <template v-if="hayBusqueda">
        Pruebe con otra búsqueda o
        <button type="button" class="text-acento underline-offset-4 hover:underline" @click="limpiarBusqueda">quite los filtros</button>.
      </template>
      <template v-else>Cargue sus planillas de PhilaxMed para empezar.</template>
    </Vacio>
    <div v-else :class="cn('overflow-x-auto transition-opacity', lista.cargando.value && 'opacity-60')">
      <table class="w-full text-left text-[13.5px]">
        <thead class="border-b border-borde bg-superficie-2 text-[12px] text-tenue">
          <tr>
            <th scope="col" class="w-10 py-2.5 pr-1 pl-4">
              <Casilla
                :model-value="paginaMarcada"
                :indeterminada="paginaParcial"
                aria-label="Seleccionar las filas de esta página"
                @update:model-value="marcarPagina($event)"
              >
                <span class="sr-only">Seleccionar página</span>
              </Casilla>
            </th>
            <th
              v-for="c in columnas"
              :key="c.clave"
              scope="col"
              :class="cn('group px-4 py-2.5 font-medium whitespace-nowrap', alineadaDerecha(c.clave, catalogo) && 'text-right')"
            >
              {{ c.etiqueta }}
              <button
                type="button"
                class="ml-1 inline-flex size-5 items-center justify-center rounded text-tenue opacity-0 group-hover:opacity-100 hover:bg-superficie-3 focus-visible:opacity-100"
                :aria-label="`Ocultar la columna ${c.etiqueta}`"
                @click="quitarColumnaVisible(c.clave)"
              >
                <X class="size-3" />
              </button>
            </th>
            <th v-if="!columnas.length" scope="col" class="px-4 py-2.5 font-medium">Sin columnas visibles</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-borde">
          <tr
            v-for="f in lista.datos.value.items"
            :key="f.id"
            :class="cn('transition-colors hover:bg-superficie-2/60', (todasLasCoincidentes || seleccion.has(f.id)) && 'bg-acento-tenue/50')"
          >
            <td class="py-2.5 pr-1 pl-4">
              <Casilla
                :model-value="todasLasCoincidentes || seleccion.has(f.id)"
                @update:model-value="marcar(f.id, $event)"
              >
                <span class="sr-only">Seleccionar fila {{ f.numero }} de {{ f.archivo }}</span>
              </Casilla>
            </td>
            <td
              v-for="(c, i) in columnas"
              :key="c.clave"
              :class="cn('max-w-64 truncate px-4 py-2.5', alineadaDerecha(c.clave, catalogo) && 'num text-right', i > 0 && 'text-suave')"
            >
              <button
                v-if="i === 0"
                type="button"
                class="max-w-full truncate text-left font-medium text-texto hover:text-acento hover:underline focus-visible:text-acento"
                :aria-label="`Ver detalle de la fila ${f.numero} de ${f.archivo}`"
                @click="detalle = f"
              >
                {{ valorCelda(f, c.clave, catalogo) || "—" }}
              </button>
              <template v-else>{{ valorCelda(f, c.clave, catalogo) || "—" }}</template>
            </td>
            <td v-if="!columnas.length" class="px-4 py-2.5">
              <Boton tamano="sm" variante="enlace" @click="detalle = f">Ver fila {{ f.numero }}</Boton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Tarjeta>
  <p v-if="lista.datos.value?.total" class="mt-3 text-[12.5px] text-tenue">
    {{ lista.datos.value.total.toLocaleString("es-CL") }} {{ lista.datos.value.total === 1 ? "registro" : "registros" }}
    <template v-if="hayBusqueda"> coinciden con la búsqueda</template>
  </p>
  <Paginacion
    v-if="lista.datos.value"
    v-model="pagina"
    class="mt-2"
    :total="lista.datos.value.total"
    :por-pagina="porPagina()"
  />

  <Dialogo
    :abierto="!!detalle"
    titulo="Detalle del registro"
    :descripcion="detalle ? `${detalle.archivo} · fila ${detalle.numero} · guardado ${tiempoRelativo(detalle.creadaEn)}` : undefined"
    @cerrar="detalle = null"
  >
    <dl v-if="detalle" class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      <div v-for="[clave, v] in Object.entries(detalle.campos).filter(([, v]) => v.o)" :key="clave" class="min-w-0">
        <dt class="text-[12px] text-tenue">{{ etiquetaDe(clave, catalogo) }}</dt>
        <dd class="text-[14px] break-words">{{ mostrarValor(tipoDe(clave, catalogo), v) }}</dd>
      </div>
    </dl>
    <template #pie>
      <Boton variante="peligro" :icono="Trash2" @click="eliminarDetalle">Eliminar esta fila</Boton>
      <Boton @click="detalle = null">Cerrar</Boton>
    </template>
  </Dialogo>

  <ElegirColumnas
    v-model="visibles"
    :abierto="eligiendoColumnas"
    :columnas="disponibles"
    :predeterminadas="PREDETERMINADAS"
    @cerrar="eligiendoColumnas = false"
  />
  <AdministrarColumnas
    v-if="catalogo && sesion.esAdmin.value"
    :abierto="administrandoColumnas"
    :catalogo="catalogo"
    @cerrar="administrandoColumnas = false"
    @eliminada="quitarColumnaVisible"
  />
  <ConfirmarEliminacion
    :abierto="confirmando"
    :titulo="`¿Eliminar ${cantidadSeleccionada.toLocaleString('es-CL')} ${cantidadSeleccionada === 1 ? 'fila' : 'filas'}?`"
    :eliminando="eliminando"
    @cerrar="confirmando = false"
    @confirmar="eliminar"
  >
    <p v-if="todasLasCoincidentes">
      Se eliminarán <strong>todas las filas que coinciden</strong>
      <template v-if="q.trim()"> con la búsqueda «{{ q.trim() }}»</template>
      <template v-if="nFiltros"> y {{ nFiltros }} {{ nFiltros === 1 ? "filtro" : "filtros" }}</template>
      <template v-if="!hayBusqueda"> guardadas en el sistema</template>.
    </p>
    <p v-else>Se eliminarán las filas seleccionadas.</p>
    <p class="mt-1">Los pacientes que queden sin filas también se eliminarán.</p>
  </ConfirmarEliminacion>
</template>

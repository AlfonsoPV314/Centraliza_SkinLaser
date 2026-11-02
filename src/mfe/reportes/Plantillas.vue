<script setup lang="ts">
import { computed, ref, shallowRef } from "vue"
import { useRouter } from "vue-router"
import {
  Copy,
  FileChartColumn,
  LayoutGrid,
  List,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "@lucide/vue"
import { campoError, mensajeError, useInformarError, useNotificar, useServicios, useUsuario } from "@/application"
import type { FiltroPlantillas } from "@/contracts"
import type { Plantilla } from "@/domain/templates"
import { useCarga, useRetardo } from "@/shared/hooks"
import { tiempoRelativo } from "@/shared/presentacion"
import {
  Boton,
  Dialogo,
  EncabezadoPagina,
  Entrada,
  Esqueleto,
  Paginacion,
  Segmentado,
  Selector,
  Tarjeta,
  Vacio,
  cn,
} from "@/shared/ui"
import FormatosPlantilla from "./componentes/FormatosPlantilla.vue"

const s = useServicios()
const { token, usuario } = useUsuario()
const router = useRouter()
const notificar = useNotificar()
const informar = useInformarError()
const q = ref("")
const tipo = ref<FiltroPlantillas["tipo"]>("todos")
const orden = ref<FiltroPlantillas["orden"]>("recientes")
const pagina = ref(1)
const vista = ref(usuario.value.preferencias.vistaPlantillas)
const eliminando = shallowRef<Plantilla | null>(null)
const ocupado = ref<string | null>(null)
const busqueda = useRetardo(q)
const porPagina = computed(() => usuario.value.preferencias.porPagina)
const lista = useCarga(
  () =>
    s.plantillas.listar(token.value, {
      q: busqueda.value,
      tipo: tipo.value,
      campo: null,
      orden: orden.value,
      pagina: pagina.value,
      porPagina: porPagina.value,
    }),
  [token, busqueda, tipo, orden, pagina, porPagina],
)
const filtrando = computed(() => !!q.value || tipo.value !== "todos")

function buscar(v: string) {
  q.value = v
  pagina.value = 1
}
function fijarTipo(t: FiltroPlantillas["tipo"]) {
  tipo.value = t
  pagina.value = 1
}
function quitarFiltros() {
  q.value = ""
  tipo.value = "todos"
}

async function duplicar(p: Plantilla) {
  ocupado.value = p.id
  try {
    const { id: _id, uso: _uso, creadaEn: _c, actualizadaEn: _a, eliminadaEn: _e, ...datos } = p
    let nombre = `${p.nombre} (copia)`
    for (let i = 2; i < 20; i++) {
      try {
        const nueva = await s.plantillas.crear(token.value, { ...datos, nombre })
        notificar({
          tono: "exito",
          titulo: "Plantilla duplicada",
          detalle: `Se creó «${nueva.nombre}».`,
          accion: { etiqueta: "Editar", alHacer: () => void router.push(`/reportes/${nueva.id}/editar`) },
        })
        lista.recargar(true)
        return
      } catch (e) {
        if (campoError(e) !== "nombre") throw e
        nombre = `${p.nombre} (copia ${i})`
      }
    }
  } catch (e) {
    informar(e, "No se pudo duplicar")
  } finally {
    ocupado.value = null
  }
}

async function eliminar() {
  const p = eliminando.value
  if (!p) return
  ocupado.value = p.id
  try {
    await s.plantillas.eliminar(token.value, [p.id])
    eliminando.value = null
    lista.recargar(true)
    notificar({
      tono: "info",
      titulo: `Se eliminó «${p.nombre}»`,
      duracion: 8000,
      accion: {
        etiqueta: "Deshacer",
        alHacer: () =>
          void s.plantillas.restaurar(token.value, [p.id]).then(
            () => lista.recargar(true),
            (e) => informar(e),
          ),
      },
    })
  } catch (e) {
    informar(e, "No se pudo eliminar")
  } finally {
    ocupado.value = null
  }
}

const usos = (p: Plantilla) =>
  p.uso.veces
    ? `Usada ${p.uso.veces} ${p.uso.veces === 1 ? "vez" : "veces"} · última ${tiempoRelativo(p.uso.ultimoUso)}`
    : "Aún no se ha usado"
const generar = (p: Plantilla) => router.push(`/reportes/${p.id}/generar`)
</script>

<template>
  <div class="animar-aparecer">
    <EncabezadoPagina
      titulo="Reportes"
      descripcion="Cada plantilla define qué archivos Excel o PDF se generan y qué contienen. Elija una y genere el reporte del período que necesite."
    >
      <template #acciones>
        <Boton variante="primario" :icono="Plus" @click="router.push('/reportes/nueva')">Nueva plantilla</Boton>
      </template>
    </EncabezadoPagina>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <Entrada
        class="w-full max-w-xs"
        :prefijo="Search"
        placeholder="Buscar plantilla"
        aria-label="Buscar plantilla"
        :model-value="q"
        @update:model-value="buscar(String($event ?? ''))"
      />
      <Segmentado
        etiqueta="Formato"
        :model-value="tipo"
        :opciones="[
          { valor: 'todos', etiqueta: 'Todas' },
          { valor: 'excel', etiqueta: 'Excel' },
          { valor: 'pdf', etiqueta: 'PDF' },
          { valor: 'ambos', etiqueta: 'Ambos' },
        ]"
        @update:model-value="fijarTipo"
      />
      <div class="ml-auto flex items-center gap-2">
        <Selector v-model="orden" class="w-44" aria-label="Ordenar">
          <option value="recientes">Más recientes</option>
          <option value="mas_usadas">Más usadas</option>
          <option value="nombre">Por nombre</option>
        </Selector>
        <Segmentado
          v-model="vista"
          etiqueta="Vista"
          :opciones="[
            { valor: 'tarjetas', etiqueta: 'Tarjetas', icono: LayoutGrid },
            { valor: 'filas', etiqueta: 'Lista', icono: List },
          ]"
        />
      </div>
    </div>

    <div v-if="lista.cargando.value && !lista.datos.value" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status">
      <Esqueleto v-for="i in 3" :key="i" class="h-44" />
    </div>
    <Tarjeta v-else-if="lista.error.value">
      <Vacio titulo="No pudimos cargar las plantillas">
        {{ mensajeError(lista.error.value) }}
        <template #accion>
          <Boton :icono="RefreshCw" @click="lista.recargar()">Reintentar</Boton>
        </template>
      </Vacio>
    </Tarjeta>
    <Tarjeta v-else-if="!lista.datos.value?.items.length">
      <Vacio :icono="FileChartColumn" :titulo="filtrando ? 'Ninguna plantilla coincide' : 'Aún no hay plantillas'">
        {{
          filtrando
            ? "Pruebe con otra búsqueda o formato."
            : "Una plantilla guarda el diseño de un reporte para generarlo con un clic cada vez."
        }}
        <template #accion>
          <Boton v-if="filtrando" @click="quitarFiltros">Quitar filtros</Boton>
          <Boton v-else variante="primario" :icono="Plus" @click="router.push('/reportes/nueva')">
            Crear la primera
          </Boton>
        </template>
      </Vacio>
    </Tarjeta>
    <div
      v-else-if="vista === 'tarjetas'"
      :class="cn('grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3', lista.cargando.value && 'opacity-60')"
    >
      <Tarjeta v-for="p in lista.datos.value.items" :key="p.id" class="group flex flex-col">
        <div class="mb-2 flex items-start justify-between gap-2">
          <FormatosPlantilla :plantilla="p" />
          <div class="-mt-1 -mr-2 flex opacity-70 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <Boton tamano="sm" variante="fantasma" solo-icono :aria-label="`Editar «${p.nombre}»`" title="Editar" :icono="Pencil" @click="router.push(`/reportes/${p.id}/editar`)" />
            <Boton tamano="sm" variante="fantasma" solo-icono :aria-label="`Duplicar «${p.nombre}»`" title="Duplicar" :icono="Copy" :cargando="ocupado === p.id" @click="duplicar(p)" />
            <Boton tamano="sm" variante="fantasma" solo-icono :aria-label="`Eliminar «${p.nombre}»`" title="Eliminar" :icono="Trash2" @click="eliminando = p" />
          </div>
        </div>
        <RouterLink :to="`/reportes/${p.id}/generar`" class="text-[15.5px] font-semibold tracking-tight hover:text-acento">
          {{ p.nombre }}
        </RouterLink>
        <p class="mt-1 line-clamp-2 flex-1 text-[13px] text-suave">{{ p.descripcion || "Sin descripción." }}</p>
        <div class="mt-4 flex items-end justify-between gap-2 border-t border-borde pt-3">
          <p class="text-[12px] text-tenue">
            {{ p.archivos.length }} {{ p.archivos.length === 1 ? "archivo" : "archivos" }} · {{ usos(p) }}
          </p>
          <Boton tamano="sm" variante="primario" :icono="Play" @click="generar(p)">Generar</Boton>
        </div>
      </Tarjeta>
    </div>
    <Tarjeta
      v-else
      :relleno="false"
      :class="cn('divide-y divide-borde overflow-hidden transition-opacity', lista.cargando.value && 'opacity-60')"
    >
      <div v-for="p in lista.datos.value.items" :key="p.id" class="flex flex-wrap items-center gap-4 px-5 py-3.5">
        <div class="min-w-0 flex-1">
          <RouterLink :to="`/reportes/${p.id}/generar`" class="text-[14.5px] font-semibold hover:text-acento">
            {{ p.nombre }}
          </RouterLink>
          <p class="truncate text-[12.5px] text-tenue">{{ usos(p) }} · editada {{ tiempoRelativo(p.actualizadaEn) }}</p>
        </div>
        <FormatosPlantilla :plantilla="p" />
        <div class="flex">
          <Boton tamano="sm" variante="fantasma" solo-icono :aria-label="`Editar «${p.nombre}»`" title="Editar" :icono="Pencil" @click="router.push(`/reportes/${p.id}/editar`)" />
          <Boton tamano="sm" variante="fantasma" solo-icono :aria-label="`Duplicar «${p.nombre}»`" title="Duplicar" :icono="Copy" :cargando="ocupado === p.id" @click="duplicar(p)" />
          <Boton tamano="sm" variante="fantasma" solo-icono :aria-label="`Eliminar «${p.nombre}»`" title="Eliminar" :icono="Trash2" @click="eliminando = p" />
        </div>
        <Boton tamano="sm" variante="primario" :icono="Play" @click="generar(p)">Generar</Boton>
      </div>
    </Tarjeta>
    <Paginacion v-if="lista.datos.value" v-model="pagina" class="mt-4" :total="lista.datos.value.total" :por-pagina="porPagina" />

    <Dialogo
      :abierto="!!eliminando"
      ancho="sm"
      :titulo="`¿Eliminar «${eliminando?.nombre}»?`"
      descripcion="Los reportes ya generados no se ven afectados. Podrá deshacerlo justo después."
      :cerrable="!ocupado"
      @cerrar="eliminando = null"
    >
      <template #pie>
        <Boton :disabled="!!ocupado" @click="eliminando = null">Cancelar</Boton>
        <Boton variante="peligro" :cargando="!!ocupado" @click="eliminar">Eliminar</Boton>
      </template>
    </Dialogo>
  </div>
</template>

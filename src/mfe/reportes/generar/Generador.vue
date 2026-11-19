<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue"
import PrevisualizadorArchivos from "./PrevisualizadorArchivos.vue"
import { RouterLink, useRouter } from "vue-router"
import { CheckCircle2, Download, FileSpreadsheet, FileText, FolderOpen, LoaderCircle, Pencil, Play, RotateCcw, TriangleAlert } from "@lucide/vue"
import { mensajeError, useInformarError, useNotificar, useServicios, useUsuario } from "@/application"
import { CARACTERISTICAS } from "@/config/features"
import type { ArchivoGenerado, EstadoDatos } from "@/contracts"
import { CAMPOS_DERIVADOS } from "@/domain/columns"
import { describirFiltro, type Grupo } from "@/domain/filters"
import type { ColumnaCatalogo } from "@/domain/model"
import { rangoAnio, rangoUsaHorario, rangoValido, type RangoFechas } from "@/domain/ranges"
import type { Plantilla } from "@/domain/templates"
import { guardarArchivos } from "@/infrastructure/descargas"
import { useRetardo } from "@/shared/hooks"
import { Boton, Campo, Casilla, EncabezadoPagina, EncabezadoTarjeta, Selector, Tarjeta, cn } from "@/shared/ui"
import EditorFiltros from "../componentes/EditorFiltros.vue"
import Migas from "../componentes/Migas.vue"
import SelectorPeriodo from "../componentes/SelectorPeriodo.vue"
import { atajos } from "./atajos"

interface LoteGenerado {
  id: number
  creadoEn: Date
  archivos: ArchivoGenerado[]
  destino: string
}

const p = defineProps<{ plantilla: Plantilla; columnas: ColumnaCatalogo[]; estado: EstadoDatos }>()
const s = useServicios()
const { token, usuario } = useUsuario()
const notificar = useNotificar()
const informarError = useInformarError()
const router = useRouter()

const anios = [...p.estado.aniosDisponibles].sort((a, b) => a - b)
const ultimo = anios.at(-1) ?? new Date().getFullYear()
const actual = new Date().getFullYear()
const ATAJOS = atajos()
const rango = shallowRef<RangoFechas>(rangoAnio(ultimo))
const atajo = ref<string | null>(ultimo === actual ? "anio" : ultimo === actual - 1 ? "anio_anterior" : null)
const filtros = shallowRef<Grupo>(p.plantilla.filtros)
const campoFecha = ref(p.plantilla.campoFecha)
const conteo = shallowRef<{ total: number; sinHora: number } | null>(null)
const contando = ref(false)
const errorConteo = ref<string | null>(null)
const pasos = ref<string[] | null>(null)
const lotes = ref<LoteGenerado[]>([])

const camposFecha = computed(() => p.columnas.filter((c) => c.tipo === "fecha"))
const etiqueta = (c: string) => [...p.columnas, ...CAMPOS_DERIVADOS].find((x) => x.clave === c)?.etiqueta ?? c
const valido = computed(() => rangoValido(rango.value))
const filtrosCambiados = computed(() => JSON.stringify(filtros.value) !== JSON.stringify(p.plantilla.filtros))
const usaHeatmap = p.plantilla.archivos.some((a) =>
  a.bloques.some((b) => b.tipo === "grafico" && b.grafico === "heatmap"),
)
const generando = computed(() => pasos.value !== null)
const usarCarpeta = computed(() => CARACTERISTICAS.carpetaDescarga && !!usuario.value.preferencias.carpetaDescarga)
const archivos = p.plantilla.archivos.filter((a) => CARACTERISTICAS.exportacion[a.formato])

const porRevisar = p.estado.filasConError + p.estado.duplicadosPendientes
const incluirPendientes = ref(false)
const consulta = computed(() => ({
  campoFecha: campoFecha.value,
  rango: rango.value,
  filtros: filtros.value,
  unidad: p.plantilla.unidad,
  incluirPendientes: incluirPendientes.value,
}))
const peticion = computed(() => ({
  plantillaId: p.plantilla.id,
  rango: rango.value,
  filtros: filtros.value,
  campoFecha: campoFecha.value,
  incluirPendientes: incluirPendientes.value,
}))
const noSePuede = computed(
  () => !valido.value || !archivos.length || conteo.value?.total === 0 || pendiente.value,
)
const consultaRetardada = useRetardo(consulta, 400)
watch(
  [consultaRetardada, token],
  ([c, t], _, alLimpiar) => {
    if (!rangoValido(c.rango)) {
      conteo.value = null
      return
    }
    let vigente = true
    alLimpiar(() => (vigente = false))
    contando.value = true
    errorConteo.value = null
    s.datos.contar(t, c).then(
      (r) => {
        if (!vigente) return
        conteo.value = r
        contando.value = false
      },
      (e) => {
        if (!vigente) return
        errorConteo.value = mensajeError(e)
        contando.value = false
      },
    )
  },
  { immediate: true },
)
const pendiente = computed(() => contando.value || consulta.value !== consultaRetardada.value)

function elegirAtajo(x: (typeof ATAJOS)[number]) {
  rango.value = x.rango()
  atajo.value = x.id
}
function cambiarRango(r: RangoFechas) {
  rango.value = r
  atajo.value = null
}

async function generar() {
  pasos.value = []
  try {
    const generados = await s.reportes.generar(
      token.value,
      { plantillaId: p.plantilla.id, rango: rango.value, filtros: filtros.value, campoFecha: campoFecha.value, incluirPendientes: incluirPendientes.value },
      (paso) => (pasos.value = [...(pasos.value ?? []), paso]),
    )
    pasos.value = [...(pasos.value ?? []), "Guardando los archivos"]
    const r = await guardarArchivos(generados, usarCarpeta.value)
    const destino = r.destino === "carpeta" ? `Carpeta «${r.carpeta}»` : "Descargas del navegador"
    lotes.value = [{ id: Date.now(), creadoEn: new Date(), archivos: generados, destino }, ...lotes.value]
    notificar({
      tono: "exito",
      titulo: generados.length === 1 ? "Reporte generado" : `${generados.length} archivos generados`,
      detalle:
        r.destino === "carpeta"
          ? `Se guardaron en la carpeta «${r.carpeta}».`
          : usarCarpeta.value
            ? "No se pudo usar tu carpeta; se descargaron con el navegador."
            : "Se descargaron con el navegador.",
    })
  } catch (e) {
    informarError(e, "No se pudo generar el reporte")
  } finally {
    pasos.value = null
  }
}
const hora = (d: Date) => d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <EncabezadoPagina
      :titulo="plantilla.nombre"
      :descripcion="plantilla.descripcion || 'Elige el período y genera los archivos de esta plantilla.'"
    >
      <template #migas><Migas :nombre="plantilla.nombre" /></template>
      <template #acciones>
        <Boton :icono="Pencil" @click="router.push(`/reportes/${plantilla.id}/editar`)">Editar plantilla</Boton>
      </template>
    </EncabezadoPagina>

    <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div class="space-y-5">
        <Tarjeta>
          <EncabezadoTarjeta
            titulo="Período"
            descripcion="Combina años, meses, rangos o días; agrega exclusiones para quitar fechas puntuales."
          />
          <div class="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Atajos de período">
            <button
              v-for="x in ATAJOS"
              :key="x.id"
              type="button"
              :aria-pressed="atajo === x.id"
              :class="
                cn(
                  'rounded-full border px-3 py-1 text-[13px] transition-colors',
                  atajo === x.id
                    ? 'border-acento bg-acento text-sobre-acento'
                    : 'border-borde text-suave hover:border-borde-fuerte hover:text-texto',
                )
              "
              @click="elegirAtajo(x)"
            >
              {{ x.etiqueta }}
            </button>
          </div>
          <SelectorPeriodo :model-value="rango" :anios="anios" @update:model-value="cambiarRango" />
        </Tarjeta>

        <Tarjeta>
          <EncabezadoTarjeta
            titulo="Filtros"
            descripcion="Vienen de la plantilla; los cambios aplican solo a esta generación."
          >
            <template v-if="filtrosCambiados" #accion>
              <Boton tamano="sm" variante="fantasma" :icono="RotateCcw" @click="filtros = plantilla.filtros">
                Restablecer
              </Boton>
            </template>
          </EncabezadoTarjeta>
          <div class="space-y-5">
            <Campo v-if="camposFecha.length > 1" etiqueta="El período se aplica sobre" html-for="campo-fecha" class="sm:max-w-xs">
              <Selector id="campo-fecha" v-model="campoFecha">
                <option v-for="c in camposFecha" :key="c.clave" :value="c.clave">{{ c.etiqueta }}</option>
              </Selector>
            </Campo>
            <EditorFiltros v-model="filtros" :columnas="columnas" />
          </div>
        </Tarjeta>
      </div>

      <aside class="space-y-4 lg:sticky lg:top-6">
        <Tarjeta>
          <p class="text-[13px] text-suave">{{ plantilla.unidad === "citas" ? "Citas" : "Filas" }} que entran en el reporte</p>
          <p
            :class="cn('num mt-1 text-[32px] leading-tight font-semibold tracking-tight transition-opacity', pendiente && 'opacity-50')"
            aria-live="polite"
          >
            <template v-if="!valido || (errorConteo && !conteo)">—</template>
            <template v-else-if="conteo">{{ conteo.total.toLocaleString("es-CL") }}</template>
            <LoaderCircle v-else class="mt-2 size-6 animate-spin text-tenue" aria-label="Contando" />
          </p>
          <p v-if="!valido" class="mt-1 text-[12.5px] text-aviso">Elige al menos un año, mes o fecha.</p>
          <p v-if="valido && conteo?.total === 0 && !pendiente" class="mt-1 text-[12.5px] text-aviso">
            No hay datos para este período y filtros.
          </p>
          <p v-if="errorConteo" class="mt-1 text-[12.5px] text-peligro">{{ errorConteo }}</p>
          <p v-if="valido && conteo?.sinHora && (rangoUsaHorario(rango) || usaHeatmap)" class="mt-1 text-[12.5px] text-tenue">
            {{ conteo.sinHora.toLocaleString("es-CL") }} sin hora registrada;
            {{ rangoUsaHorario(rango) ? "no entran en el horario elegido" : "no aparecen en el mapa de calor" }}.
          </p>
          <div
            v-if="porRevisar"
            class="mt-3 rounded-lg border border-aviso/30 bg-aviso/10 px-3 py-2.5 text-[12.5px]"
            role="note"
          >
            <p class="flex gap-1.5 font-medium text-aviso">
              <TriangleAlert class="mt-px size-3.5 shrink-0" aria-hidden="true" />
              {{ porRevisar.toLocaleString("es-CL") }} {{ porRevisar === 1 ? "fila está pendiente" : "filas están pendientes" }} de revisión
            </p>
            <p class="mt-1 text-suave">
              {{ incluirPendientes ? "Se incluirán tal como están, sin corregir." : "No se usarán en este reporte hasta que las revise." }}
              <RouterLink :to="{ path: '/datos', query: { pestana: estado.filasConError ? 'errores' : 'duplicados' } }" class="text-acento underline-offset-4 hover:underline">Revisar</RouterLink>
            </p>
            <Casilla v-model="incluirPendientes" class="mt-2">Incluirlas de todos modos</Casilla>
          </div>
          <p v-if="filtros.hijos.length" class="mt-3 border-t border-borde pt-3 text-[12.5px] text-tenue">
            {{ describirFiltro(filtros, etiqueta) }}
          </p>

          <ul class="mt-4 space-y-1.5 border-t border-borde pt-4">
            <li v-for="a in archivos" :key="a.id" class="flex items-center gap-2 text-[13px]">
              <FileSpreadsheet v-if="a.formato === 'excel'" class="size-4 shrink-0 text-exito" aria-hidden="true" />
              <FileText v-else class="size-4 shrink-0 text-peligro" aria-hidden="true" />
              <span class="truncate">{{ a.nombre }}</span>
              <span class="ml-auto text-[12px] text-tenue">{{ a.formato === "excel" ? "xlsx" : "pdf" }}</span>
            </li>
          </ul>

          <PrevisualizadorArchivos :peticion="peticion" :deshabilitado="noSePuede" />

          <Boton
            variante="primario"
            class="mt-4 w-full"
            :icono="Play"
            :cargando="generando"
            :disabled="!valido || !archivos.length || conteo?.total === 0 || pendiente"
            @click="generar"
          >
            {{ generando ? "Generando…" : archivos.length > 1 ? `Generar ${archivos.length} archivos` : "Generar" }}
          </Boton>
          <p class="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-tenue">
            <FolderOpen class="size-3.5" aria-hidden="true" />
            <template v-if="usarCarpeta">Se guardarán en «{{ usuario.preferencias.carpetaDescarga }}»</template>
            <span v-else>
              Se descargarán con el navegador.
              <RouterLink v-if="CARACTERISTICAS.carpetaDescarga" to="/perfil" class="text-acento hover:underline">
                Elegir carpeta
              </RouterLink>
            </span>
          </p>

          <ol v-if="pasos" class="animar-aparecer mt-4 space-y-1.5 border-t border-borde pt-4" aria-live="polite">
            <li
              v-for="(paso, i) in pasos"
              :key="i"
              :class="cn('flex items-start gap-2 text-[12.5px]', i === pasos.length - 1 ? 'text-texto' : 'text-tenue')"
            >
              <LoaderCircle v-if="i === pasos.length - 1" class="mt-0.5 size-3.5 shrink-0 animate-spin text-acento" aria-hidden="true" />
              <CheckCircle2 v-else class="mt-0.5 size-3.5 shrink-0 text-exito" aria-hidden="true" />
              {{ paso }}
            </li>
          </ol>
        </Tarjeta>

        <Tarjeta v-if="lotes.length">
          <p class="mb-3 text-[13px] font-semibold">Generados en esta sesión</p>
          <div class="space-y-4">
            <div v-for="l in lotes" :key="l.id">
              <p class="mb-1.5 text-[12px] text-tenue">{{ hora(l.creadoEn) }} · {{ l.destino }}</p>
              <ul class="space-y-1">
                <li v-for="f in l.archivos" :key="f.nombre" class="flex items-center gap-2 text-[13px]">
                  <FileSpreadsheet v-if="f.formato === 'excel'" class="size-4 shrink-0 text-exito" aria-hidden="true" />
                  <FileText v-else class="size-4 shrink-0 text-peligro" aria-hidden="true" />
                  <span class="min-w-0 flex-1 truncate" :title="f.nombre">{{ f.nombre }}</span>
                  <Boton
                    tamano="sm"
                    variante="fantasma"
                    solo-icono
                    :aria-label="`Descargar ${f.nombre}`"
                    :icono="Download"
                    @click="guardarArchivos([f], false)"
                  />
                </li>
              </ul>
            </div>
          </div>
        </Tarjeta>
      </aside>
    </div>
  </div>
</template>

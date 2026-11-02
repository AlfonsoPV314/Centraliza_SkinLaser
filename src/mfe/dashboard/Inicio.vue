<script setup lang="ts">
import { computed, ref, shallowRef } from "vue"
import type { EChartsOption } from "echarts"
import {
  ArrowRight,
  CopyX,
  FileChartColumn,
  FileWarning,
  History,
  Rows3,
  Undo2,
  Upload,
  UserRoundPen,
  Users,
} from "@lucide/vue"
import { avisarCambioDatos, useCambiosDatos, useInformarError, useNotificar, useServicios, useUsuario } from "@/application"
import type { EstadoDatos, Importacion } from "@/contracts"
import { CAMPOS_BASE, CAMPOS_CONOCIDOS } from "@/domain/columns"
import { MESES_CORTOS } from "@/domain/dates"
import { formatearNumero, plural } from "@/domain/format"
import type { Plantilla } from "@/domain/templates"
import { fechaLarga, resumenConteos, saludo, tiempoRelativo } from "@/shared/presentacion"
import { Boton, Dialogo, EncabezadoTarjeta, Esqueleto, Grafico, Insignia, Tarjeta, Vacio, cn, useColoresTema } from "@/shared/ui"
import Indicador from "./Indicador.vue"

type Resumen = { total: number; masUsadas: Plantilla[]; recientes: Plantilla[] }
const entero = (n: number) => formatearNumero(n, 0)

const s = useServicios()
const { usuario, token } = useUsuario()
const informar = useInformarError()
const notificar = useNotificar()
const colores = useColoresTema()
const estado = shallowRef<EstadoDatos | null>(null)
const cargas = shallowRef<Importacion[] | null>(null)
const resumen = shallowRef<Resumen | null>(null)
const deshacer = shallowRef<Importacion | null>(null)
const deshaciendo = ref(false)

function cargar() {
  Promise.all([s.datos.estado(token.value), s.ingesta.listar(token.value, 6), s.plantillas.resumen(token.value)])
    .then(([e, c, r]) => {
      estado.value = e
      cargas.value = c
      resumen.value = r
    })
    .catch((e) => informar(e, "No pudimos cargar el resumen"))
}
cargar()
useCambiosDatos(cargar)

async function confirmarDeshacer() {
  if (!deshacer.value) return
  deshaciendo.value = true
  try {
    await s.ingesta.deshacer(token.value, deshacer.value.id)
    notificar({ tono: "exito", titulo: "Carga deshecha", detalle: "Los datos volvieron a como estaban antes de esa carga." })
    deshacer.value = null
    avisarCambioDatos()
  } catch (e) {
    informar(e, "No se pudo deshacer la carga")
  } finally {
    deshaciendo.value = false
  }
}

const nombre = computed(() => usuario.value.nombreUsuario.split(" ")[0])
const pendientes = computed(() =>
  estado.value ? estado.value.filasConError + estado.value.duplicadosPendientes + estado.value.pacientesIncompletos : 0,
)

const itemsPendientes = computed(() => {
  const e = estado.value
  if (!e) return []
  return [
    {
      n: e.filasConError,
      icono: FileWarning,
      texto: plural(e.filasConError, "fila con error", "filas con error"),
      detalle: "No se guardaron. Corríjalas o descártelas.",
      a: "/datos?pestana=errores",
    },
    {
      n: e.duplicadosPendientes,
      icono: CopyX,
      texto: plural(e.duplicadosPendientes, "duplicado por decidir", "duplicados por decidir"),
      detalle: "Elija qué conservar.",
      a: "/datos?pestana=duplicados",
    },
    {
      n: e.pacientesIncompletos,
      icono: UserRoundPen,
      texto: plural(e.pacientesIncompletos, "paciente con datos faltantes", "pacientes con datos faltantes"),
      detalle: "Complete la ficha base.",
      a: "/datos?pestana=pacientes",
    },
  ].filter((i) => i.n > 0)
})

const opcionGrafico = computed<EChartsOption>(() => {
  const datos = estado.value?.filasPorMes ?? []
  const c = colores.value
  return {
    grid: { left: 8, right: 8, top: 16, bottom: 4, containLabel: true },
    tooltip: {
      trigger: "axis",
      backgroundColor: c.superficie,
      borderColor: c.borde,
      textStyle: { color: c.texto, fontSize: 12 },
      valueFormatter: (v) => `${entero(Number(v))} filas`,
    },
    xAxis: {
      type: "category",
      data: datos.map(({ mes }) => {
        const [a, m] = mes.split("-")
        return `${MESES_CORTOS[Number(m) - 1]} ${a.slice(2)}`
      }),
      axisLine: { lineStyle: { color: c.borde } },
      axisTick: { show: false },
      axisLabel: { color: c.tenue, fontSize: 11 },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: c.borde, type: "dashed" } },
      axisLabel: { color: c.tenue, fontSize: 11 },
    },
    series: [
      {
        type: "bar",
        data: datos.map((d) => d.filas),
        barMaxWidth: 28,
        itemStyle: { color: c.acento, borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { opacity: 0.85 } },
      },
    ],
  }
})

const frecuentes = computed(() =>
  resumen.value ? (resumen.value.masUsadas.length ? resumen.value.masUsadas : resumen.value.recientes).slice(0, 4) : [],
)

function completitud(campo: (typeof CAMPOS_BASE)[number]) {
  const e = estado.value!
  const faltan = e.faltantesPorCampo[campo] ?? 0
  return e.pacientes ? Math.round(((e.pacientes - faltan) / e.pacientes) * 100) : 0
}
</script>

<template>
  <div class="animar-aparecer">
    <header class="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-[13px] text-tenue capitalize">{{ fechaLarga() }}</p>
        <h1 class="mt-1 text-[28px] leading-tight font-semibold tracking-tight">{{ saludo() }}, {{ nombre }}</h1>
      </div>
      <div class="flex gap-2">
        <RouterLink to="/reportes"><Boton :icono="FileChartColumn">Generar reporte</Boton></RouterLink>
        <RouterLink to="/cargar"><Boton variante="primario" :icono="Upload">Cargar planillas</Boton></RouterLink>
      </div>
    </header>

    <Tarjeta v-if="estado && estado.filas === 0" class="overflow-hidden" :relleno="false">
      <Vacio :icono="Upload" titulo="Todavía no hay datos guardados" class="py-16">
        Suba las planillas de Excel exportadas desde PhilaxMed u otros sistemas. Reconoceremos las columnas, uniremos los
        pacientes y le avisaremos de cualquier problema antes de guardar.
        <template #accion>
          <RouterLink to="/cargar"><Boton variante="primario" tamano="lg">Cargar mi primera planilla</Boton></RouterLink>
        </template>
      </Vacio>
    </Tarjeta>

    <template v-else>
      <section aria-label="Resumen" class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador :icono="Rows3" etiqueta="Filas guardadas" :valor="estado && entero(estado.filas)" />
        <Indicador :icono="Users" etiqueta="Pacientes" :valor="estado && entero(estado.pacientes)" />
        <Indicador
          :icono="History"
          etiqueta="Última carga"
          :valor="estado && (estado.ultimaCarga ? tiempoRelativo(estado.ultimaCarga) : 'Sin cargas')"
          pequeno
        />
        <Indicador
          :icono="FileWarning"
          etiqueta="Por revisar"
          :valor="estado && entero(pendientes)"
          :tono="pendientes ? 'aviso' : 'exito'"
          :enlace="pendientes ? '/datos' : undefined"
        />
      </section>

      <section v-if="itemsPendientes.length" aria-label="Pendientes" class="mb-6 grid gap-3 md:grid-cols-3">
        <RouterLink
          v-for="i in itemsPendientes"
          :key="i.a"
          :to="i.a"
          class="group flex items-start gap-3 rounded-xl border border-aviso/30 bg-aviso/8 p-4 transition-colors hover:border-aviso/60"
        >
          <component :is="i.icono" class="mt-0.5 size-4 shrink-0 text-aviso" />
          <span class="min-w-0 flex-1">
            <span class="block text-[14px] font-medium">{{ i.texto }}</span>
            <span class="block text-[12.5px] text-suave">{{ i.detalle }}</span>
          </span>
          <ArrowRight class="mt-0.5 size-4 shrink-0 text-tenue transition-transform group-hover:translate-x-0.5" />
        </RouterLink>
      </section>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div class="space-y-6">
          <Tarjeta>
            <EncabezadoTarjeta titulo="Filas por mes" descripcion="Según la fecha de cada registro, últimos 15 meses con datos." />
            <Esqueleto v-if="!estado" class="h-[260px]" />
            <p v-else-if="!estado.filasPorMes.length" class="py-16 text-center text-[13.5px] text-suave">
              Ninguna fila tiene fecha reconocible.
            </p>
            <Grafico
              v-else
              :opcion="opcionGrafico"
              :alto="260"
              :etiqueta="`Gráfico de barras de filas por mes: ${estado.filasPorMes.map((d) => `${d.mes}, ${d.filas}`).join('; ')}`"
            />
          </Tarjeta>
          <Tarjeta>
            <EncabezadoTarjeta titulo="Últimas cargas" :icono="History">
              <template #accion>
                <RouterLink to="/datos?pestana=historial" class="text-[13px] text-acento hover:underline">Ver historial</RouterLink>
              </template>
            </EncabezadoTarjeta>
            <div v-if="!cargas" class="space-y-3"><Esqueleto v-for="i in 3" :key="i" class="h-12" /></div>
            <p v-else-if="!cargas.length" class="py-6 text-center text-[13.5px] text-suave">Aún no hay cargas.</p>
            <ul v-else class="-mx-2 divide-y divide-borde">
              <li v-for="c in cargas" :key="c.id" class="flex items-center gap-3 px-2 py-3">
                <div class="min-w-0 flex-1">
                  <p class="truncate text-[14px] font-medium">{{ c.archivos.map((a) => a.nombre).join(", ") }}</p>
                  <p class="truncate text-[12.5px] text-tenue">
                    {{ tiempoRelativo(c.creadaEn) }} · {{ c.usuario }} · {{ resumenConteos(c.conteos) }}
                  </p>
                </div>
                <Insignia v-if="c.estado === 'deshecha'">Deshecha</Insignia>
                <Boton v-else-if="c.sePuedeDeshacer" tamano="sm" variante="fantasma" :icono="Undo2" @click="deshacer = c">
                  Deshacer
                </Boton>
              </li>
            </ul>
          </Tarjeta>
        </div>

        <div class="space-y-6">
          <Tarjeta>
            <EncabezadoTarjeta titulo="Reportes frecuentes" :icono="FileChartColumn">
              <template #accion>
                <RouterLink to="/reportes" class="text-[13px] text-acento hover:underline">Todas</RouterLink>
              </template>
            </EncabezadoTarjeta>
            <div v-if="!resumen" class="space-y-2"><Esqueleto v-for="i in 3" :key="i" class="h-11" /></div>
            <div v-else-if="resumen.total === 0" class="py-4 text-center">
              <p class="mb-3 text-[13.5px] text-suave">Cree una plantilla para generar reportes con un clic.</p>
              <RouterLink to="/reportes/nueva"><Boton tamano="sm">Nueva plantilla</Boton></RouterLink>
            </div>
            <ul v-else class="-mx-1 space-y-0.5">
              <li v-for="p in frecuentes" :key="p.id">
                <RouterLink
                  :to="`/reportes/${p.id}/generar`"
                  class="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-superficie-2"
                >
                  <span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-acento-tenue text-acento">
                    <FileChartColumn class="size-4" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-[13.5px] font-medium">{{ p.nombre }}</span>
                    <span class="block text-[12px] text-tenue">
                      {{ p.uso.veces ? `Usada ${plural(p.uso.veces, "vez", "veces")}` : "Sin usar" }}
                    </span>
                  </span>
                  <ArrowRight class="size-4 text-tenue opacity-0 transition-opacity group-hover:opacity-100" />
                </RouterLink>
              </li>
            </ul>
          </Tarjeta>
          <Tarjeta>
            <EncabezadoTarjeta titulo="Datos de pacientes" descripcion="Qué tan completa está la ficha base." :icono="UserRoundPen" />
            <div v-if="!estado" class="space-y-3"><Esqueleto v-for="c in CAMPOS_BASE" :key="c" class="h-6" /></div>
            <ul v-else class="space-y-3.5">
              <li v-for="campo in CAMPOS_BASE" :key="campo">
                <div class="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
                  <span>{{ CAMPOS_CONOCIDOS[campo].etiqueta }}</span>
                  <span
                    :class="
                      cn(
                        'tabular-nums',
                        completitud(campo) === 100 ? 'text-exito' : completitud(campo) < 70 ? 'text-aviso' : 'text-suave',
                      )
                    "
                  >
                    {{ completitud(campo) }}%
                  </span>
                </div>
                <div
                  class="h-1.5 overflow-hidden rounded-full bg-superficie-3"
                  role="progressbar"
                  :aria-valuenow="completitud(campo)"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-label="CAMPOS_CONOCIDOS[campo].etiqueta"
                >
                  <div
                    :class="
                      cn(
                        'h-full rounded-full',
                        completitud(campo) === 100 ? 'bg-exito' : completitud(campo) < 70 ? 'bg-aviso' : 'bg-acento',
                      )
                    "
                    :style="{ width: `${completitud(campo)}%` }"
                  />
                </div>
              </li>
            </ul>
          </Tarjeta>
        </div>
      </div>
    </template>

    <Dialogo :abierto="!!deshacer" titulo="¿Deshacer esta carga?" ancho="sm" @cerrar="!deshaciendo && (deshacer = null)">
      <p v-if="deshacer" class="text-[14px] leading-relaxed text-suave">
        Se quitarán las filas que agregó, se restaurarán las que reemplazó y se descartarán sus filas con error y duplicados
        pendientes. Resumen: {{ resumenConteos(deshacer.conteos).toLowerCase() }}.
      </p>
      <template #pie>
        <Boton :disabled="deshaciendo" @click="deshacer = null">Cancelar</Boton>
        <Boton variante="peligro" :cargando="deshaciendo" @click="confirmarDeshacer">Deshacer carga</Boton>
      </template>
    </Dialogo>
  </div>
</template>

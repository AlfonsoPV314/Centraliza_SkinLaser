<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watchEffect } from "vue"
import { onBeforeRouteLeave, useRouter } from "vue-router"
import { ChevronRight, CircleAlert, FileSpreadsheet, FileText, Play } from "@lucide/vue"
import { campoError, mensajeError, useInformarError, useNotificar, useServicios, useUsuario } from "@/application"
import { CARACTERISTICAS } from "@/config/features"
import type { DatosPlantilla } from "@/contracts"
import { CAMPOS_DERIVADOS } from "@/domain/columns"
import type { ColumnaCatalogo } from "@/domain/model"
import {
  archivoNuevo,
  bloqueNuevo,
  plantillaVacia,
  validarPlantilla,
  type ArchivoPlantilla,
  type DatosEditablesPlantilla,
  type FormatoArchivo,
  type Plantilla,
  type TipoBloque,
} from "@/domain/templates"
import {
  AreaTexto,
  Aviso,
  Boton,
  Campo,
  Dialogo,
  EncabezadoPagina,
  EncabezadoTarjeta,
  Entrada,
  Segmentado,
  SelectorBuscable,
  Tarjeta,
  cn,
} from "@/shared/ui"
import EditorFiltros from "../componentes/EditorFiltros.vue"
import { mover } from "./bloques"
import TarjetaArchivo from "./TarjetaArchivo.vue"

const p = defineProps<{ columnas: ColumnaCatalogo[]; original: Plantilla | null }>()
const s = useServicios()
const { token } = useUsuario()
const router = useRouter()
const notificar = useNotificar()
const informarError = useInformarError()

const aDatos = (x: Plantilla): DatosEditablesPlantilla => ({
  nombre: x.nombre,
  descripcion: x.descripcion,
  archivos: x.archivos,
  filtros: x.filtros,
  campoFecha: x.campoFecha,
  unidad: x.unidad,
})
const serializar = (x: DatosEditablesPlantilla) => JSON.stringify(x)

const camposFecha = p.columnas.filter((c) => c.tipo === "fecha")
const plantilla = shallowRef(p.original)
const d = shallowRef<DatosEditablesPlantilla>(
  p.original
    ? aDatos(p.original)
    : plantillaVacia(camposFecha.find((c) => c.clave === "fecha_registro")?.clave ?? camposFecha[0]?.clave),
)
const guardado = ref(serializar(d.value))
const intentado = ref(!!p.original)
const errorNombre = ref<string | null>(null)
const guardando = ref(false)
const quitando = shallowRef<ArchivoPlantilla | null>(null)

const catalogo = [...p.columnas, ...CAMPOS_DERIVADOS]
const tipos = new Map(catalogo.map((c) => [c.clave, c.tipo]))
const errores = computed(() => validarPlantilla(d.value, (c) => tipos.get(c)))
const visibles = computed<Record<string, string>>(() =>
  intentado.value ? { ...errores.value, ...(errorNombre.value ? { nombre: errorNombre.value } : {}) } : {},
)
const cantidadErrores = computed(() => Object.keys(errores.value).length)
const sucio = computed(() => serializar(d.value) !== guardado.value)
const totalBloques = computed(() => d.value.archivos.reduce((n, a) => n + a.bloques.length, 0))

const cambiar = (parcial: Partial<DatosEditablesPlantilla>) => (d.value = { ...d.value, ...parcial })

// Protección ante salir con cambios sin guardar: dentro de la app y al cerrar la pestaña.
const confirmandoSalida = ref(false)
let resolverSalida: ((salir: boolean) => void) | null = null
onBeforeRouteLeave((to, from) => {
  if (!sucio.value || guardando.value || to.path === from.path) return true
  confirmandoSalida.value = true
  return new Promise<boolean>((r) => (resolverSalida = r))
})
function decidirSalida(salir: boolean) {
  confirmandoSalida.value = false
  resolverSalida?.(salir)
  resolverSalida = null
}
watchEffect((alLimpiar) => {
  if (!sucio.value) return
  const avisar = (e: BeforeUnloadEvent) => e.preventDefault()
  window.addEventListener("beforeunload", avisar)
  alLimpiar(() => window.removeEventListener("beforeunload", avisar))
})

const fijarArchivo = (a: ArchivoPlantilla) =>
  cambiar({ archivos: d.value.archivos.map((x) => (x.id === a.id ? a : x)) })
function agregarBloque(a: ArchivoPlantilla, tipo: TipoBloque) {
  const b = bloqueNuevo(
    tipo,
    p.columnas.find((c) => c.tipo === "monto")?.clave ?? p.columnas.find((c) => c.tipo === "numero")?.clave ?? "",
  )
  fijarArchivo({ ...a, bloques: [...a.bloques, b] })
  nextTick(() =>
    document.getElementById(`bloque-${b.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
  )
}
function agregarArchivo(formato: FormatoArchivo) {
  const a = archivoNuevo(formato)
  cambiar({ archivos: [...d.value.archivos, a] })
  nextTick(() => document.getElementById(`archivo-${a.id}-nombre`)?.focus())
}
function quitarArchivo(a: ArchivoPlantilla) {
  if (a.bloques.length) quitando.value = a
  else cambiar({ archivos: d.value.archivos.filter((y) => y.id !== a.id) })
}
function confirmarQuitar() {
  const id = quitando.value?.id
  cambiar({ archivos: d.value.archivos.filter((y) => y.id !== id) })
  quitando.value = null
}

function irAlError(clave: string) {
  const [tipo, ident, campo] = clave.split(":")
  const destino =
    tipo === "bloque"
      ? `bloque-${ident}`
      : tipo === "archivo"
        ? `archivo-${ident}-${campo === "nombre" ? "nombre" : "bloques"}`
        : `campo-${clave}`
  const el = document.getElementById(destino)
  el?.scrollIntoView({ behavior: "smooth", block: "center" })
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) el.focus({ preventScroll: true })
}

function aplicar(x: Plantilla) {
  plantilla.value = x
  d.value = aDatos(x)
  guardado.value = serializar(d.value)
}

async function guardar() {
  intentado.value = true
  const claves = Object.keys(errores.value)
  if (claves.length) {
    irAlError(claves[0])
    return
  }
  const datos: DatosPlantilla = {
    ...d.value,
    nombre: d.value.nombre.trim(),
    descripcion: d.value.descripcion.trim(),
    archivos: d.value.archivos.map((a) => ({ ...a, nombre: a.nombre.trim() })),
  }
  guardando.value = true
  errorNombre.value = null
  try {
    if (plantilla.value) {
      const { actual, anterior } = await s.plantillas.actualizar(token.value, plantilla.value.id, datos)
      aplicar(actual)
      notificar({
        tono: "exito",
        titulo: "Cambios guardados",
        accion: {
          etiqueta: "Deshacer",
          alHacer: async () => {
            try {
              const { actual: restaurada } = await s.plantillas.actualizar(token.value, anterior.id, aDatos(anterior))
              aplicar(restaurada)
              notificar({ tono: "info", titulo: "Se restauró la versión anterior" })
            } catch (e) {
              informarError(e, "No se pudo deshacer")
            }
          },
        },
      })
    } else {
      const nueva = await s.plantillas.crear(token.value, datos)
      guardado.value = serializar(d.value)
      notificar({
        tono: "exito",
        titulo: "Plantilla creada",
        detalle: `«${nueva.nombre}» ya está disponible.`,
        accion: { etiqueta: "Generar", alHacer: () => void router.push(`/reportes/${nueva.id}/generar`) },
      })
      await router.replace(`/reportes/${nueva.id}/editar`)
    }
  } catch (e) {
    if (campoError(e) === "nombre") {
      errorNombre.value = mensajeError(e)
      irAlError("nombre")
    } else informarError(e, "No se pudo guardar la plantilla")
  } finally {
    guardando.value = false
  }
}

const irAArchivo = (id: string) =>
  document.getElementById(`archivo-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <EncabezadoPagina
      :titulo="d.nombre.trim() || (plantilla ? plantilla.nombre : 'Nueva plantilla')"
      descripcion="Define qué archivos se generan y qué contiene cada uno. El período se elige al generar."
    >
      <template #migas>
        <nav aria-label="Ruta" class="flex items-center gap-1">
          <RouterLink to="/reportes" class="hover:text-texto">Reportes</RouterLink>
          <ChevronRight class="size-3.5" aria-hidden="true" />
          <span aria-current="page">{{ plantilla ? "Editar plantilla" : "Nueva plantilla" }}</span>
        </nav>
      </template>
      <template #acciones>
        <Boton
          v-if="plantilla"
          :icono="Play"
          :disabled="sucio"
          :title="sucio ? 'Guarda los cambios antes de generar' : undefined"
          @click="router.push(`/reportes/${plantilla.id}/generar`)"
        >
          Generar
        </Boton>
        <Boton variante="primario" :cargando="guardando" @click="guardar">
          {{ plantilla ? "Guardar cambios" : "Crear plantilla" }}
        </Boton>
      </template>
    </EncabezadoPagina>

    <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div class="space-y-5">
        <Tarjeta>
          <EncabezadoTarjeta titulo="General" />
          <div class="space-y-4">
            <Campo etiqueta="Nombre" html-for="campo-nombre" :error="visibles.nombre">
              <Entrada
                id="campo-nombre"
                :model-value="d.nombre"
                :maxlength="140"
                :invalido="!!visibles.nombre"
                placeholder="Ej.: Ingresos mensuales por profesional"
                @update:model-value="(cambiar({ nombre: String($event ?? '') }), (errorNombre = null))"
              />
            </Campo>
            <Campo
              etiqueta="Descripción"
              html-for="campo-descripcion"
              opcional
              :error="visibles.descripcion"
              :ayuda="`${d.descripcion.length}/500`"
            >
              <AreaTexto
                id="campo-descripcion"
                :rows="2"
                :model-value="d.descripcion"
                :invalido="!!visibles.descripcion"
                placeholder="Para qué sirve y a quién va dirigido"
                @update:model-value="cambiar({ descripcion: $event ?? '' })"
              />
            </Campo>
          </div>
        </Tarjeta>

        <Tarjeta>
          <EncabezadoTarjeta titulo="Datos" descripcion="Qué filas entran en el reporte. Al generar se pueden ajustar." />
          <div class="space-y-5">
            <div class="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Campo de fecha del período" html-for="campo-campoFecha" :error="visibles.campoFecha">
                <SelectorBuscable
                  id="campo-campoFecha"
                  :model-value="d.campoFecha"
                  :invalido="!!visibles.campoFecha"
                  :opciones="camposFecha.map((c) => ({ valor: c.clave, etiqueta: c.etiqueta }))"
                  @update:model-value="cambiar({ campoFecha: $event })"
                />
              </Campo>
              <Campo
                v-if="CARACTERISTICAS.consolidacionPagos || d.unidad === 'citas'"
                etiqueta="Contar por"
                :ayuda="d.unidad === 'citas' ? 'Une los pagos de una misma cita en una sola fila.' : 'Cada fila cargada cuenta una vez.'"
              >
                <Segmentado
                  etiqueta="Unidad de análisis"
                  :model-value="d.unidad"
                  :opciones="[
                    { valor: 'filas', etiqueta: 'Filas' },
                    { valor: 'citas', etiqueta: 'Citas' },
                  ]"
                  @update:model-value="cambiar({ unidad: $event })"
                />
              </Campo>
            </div>
            <div>
              <p class="mb-2 text-[13px] font-medium">Filtros por defecto</p>
              <EditorFiltros :model-value="d.filtros" :columnas="columnas" @update:model-value="cambiar({ filtros: $event })" />
            </div>
          </div>
        </Tarjeta>

        <section aria-labelledby="titulo-archivos" class="space-y-4">
          <div class="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="titulo-archivos" class="text-[15px] font-semibold">Archivos de salida</h2>
              <p class="text-[13px] text-suave">Cada archivo se genera por separado. Puedes combinar Excel y PDF.</p>
            </div>
            <div class="flex gap-2">
              <Boton tamano="sm" :icono="FileSpreadsheet" @click="agregarArchivo('excel')">Agregar Excel</Boton>
              <Boton tamano="sm" :icono="FileText" @click="agregarArchivo('pdf')">Agregar PDF</Boton>
            </div>
          </div>
          <Aviso v-if="visibles.archivos" tono="peligro">{{ visibles.archivos }}</Aviso>
          <TarjetaArchivo
            v-for="(a, ia) in d.archivos"
            :key="a.id"
            :a="a"
            :errores="visibles"
            :columnas="catalogo"
            :primero="ia === 0"
            :ultimo="ia === d.archivos.length - 1"
            @cambiar="fijarArchivo"
            @agregar-bloque="agregarBloque(a, $event)"
            @mover="cambiar({ archivos: mover(d.archivos, ia, $event) })"
            @quitar="quitarArchivo(a)"
          />
        </section>
      </div>

      <aside class="space-y-4 lg:sticky lg:top-6">
        <Tarjeta>
          <p class="mb-3 text-[13px] font-semibold">Resumen</p>
          <ul class="space-y-1.5">
            <li v-for="a in d.archivos" :key="a.id">
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[13px] hover:bg-superficie-2"
                @click="irAArchivo(a.id)"
              >
                <FileSpreadsheet v-if="a.formato === 'excel'" class="size-4 shrink-0 text-exito" aria-hidden="true" />
                <FileText v-else class="size-4 shrink-0 text-peligro" aria-hidden="true" />
                <span class="truncate">{{ a.nombre.trim() || "Sin nombre" }}</span>
                <span class="num ml-auto text-[12px] text-tenue">{{ a.bloques.length }}</span>
              </button>
            </li>
          </ul>
          <p class="mt-3 border-t border-borde pt-3 text-[12.5px] text-tenue">
            {{ d.archivos.length }} {{ d.archivos.length === 1 ? "archivo" : "archivos" }} · {{ totalBloques }}
            {{ totalBloques === 1 ? "contenido" : "contenidos" }}
          </p>
        </Tarjeta>

        <Tarjeta v-if="intentado && cantidadErrores > 0" class="border-peligro/30">
          <p class="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-peligro">
            <CircleAlert class="size-4" aria-hidden="true" />
            {{ cantidadErrores === 1 ? "1 punto por revisar" : `${cantidadErrores} puntos por revisar` }}
          </p>
          <ul class="space-y-1">
            <li v-for="[k, m] in Object.entries(errores).slice(0, 6)" :key="k">
              <button
                type="button"
                class="text-left text-[12.5px] text-suave hover:text-texto hover:underline"
                @click="irAlError(k)"
              >
                {{ m }}
              </button>
            </li>
          </ul>
        </Tarjeta>
        <p v-if="sucio" :class="cn('px-1 text-[12.5px] text-tenue')">Hay cambios sin guardar.</p>
      </aside>
    </div>

    <Dialogo
      :abierto="!!quitando"
      ancho="sm"
      titulo="¿Quitar este archivo?"
      :descripcion="
        quitando
          ? `«${quitando.nombre.trim() || 'Sin nombre'}» tiene ${quitando.bloques.length} ${quitando.bloques.length === 1 ? 'contenido' : 'contenidos'}. El cambio se aplica al guardar.`
          : undefined
      "
      @cerrar="quitando = null"
    >
      <template #pie>
        <Boton @click="quitando = null">Cancelar</Boton>
        <Boton variante="peligro" @click="confirmarQuitar">Quitar archivo</Boton>
      </template>
    </Dialogo>

    <Dialogo
      :abierto="confirmandoSalida"
      ancho="sm"
      titulo="¿Salir sin guardar?"
      descripcion="Los cambios de esta plantilla se perderán."
      @cerrar="decidirSalida(false)"
    >
      <template #pie>
        <Boton @click="decidirSalida(false)">Seguir editando</Boton>
        <Boton variante="peligro" @click="decidirSalida(true)">Salir sin guardar</Boton>
      </template>
    </Dialogo>
  </div>
</template>

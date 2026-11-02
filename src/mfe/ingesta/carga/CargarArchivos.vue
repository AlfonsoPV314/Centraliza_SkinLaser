<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue"
import { CheckCircle2, RotateCcw, Upload, X } from "@lucide/vue"
import { avisarCambioDatos, mensajeError, useInformarError, useServicios, useUsuario, useNotificar } from "@/application"
import type { Importacion, PeticionImportacion } from "@/contracts"
import { EXTENSIONES_PERMITIDAS, LIMITE_ARCHIVO_MB } from "@/config/features"
import { detectarTipoPlanilla } from "@/domain/columns"
import { claveDuplicado } from "@/domain/duplicates"
import type { ColumnaCatalogo, FilaGuardada, FilaProcesada } from "@/domain/model"
import { tieneErrores } from "@/domain/rules"
import {
  analizarArchivo,
  olvidarArchivo,
  procesarHoja,
  reanalizarHoja,
  validarArchivo,
  type AnalisisHoja,
} from "@/infrastructure/ingesta/lector"
import { Aviso, Boton, Detalles, EncabezadoPagina, Tarjeta, cn } from "@/shared/ui"
import DecisionRevision from "./DecisionRevision.vue"
import MapeoHoja from "./MapeoHoja.vue"
import ResultadoCarga from "./ResultadoCarga.vue"
import RevisionLote from "./RevisionLote.vue"
import {
  aplicarIgnoradas,
  armarPeticion,
  clasificar,
  columnasExtraDe,
  problemasMapeo,
  type Lote,
} from "./preparar"
import type { HojaElegida } from "./tipos"

type Paso = "hojas" | "procesando" | "decidir" | "revisar" | "guardando" | "listo"

const s = useServicios()
const { token } = useUsuario()
const informar = useInformarError()
const notificar = useNotificar()

const hojas = ref<HojaElegida[]>([])
const archivos = new Map<string, File>()
const leyendo = ref<string[]>([])
const rechazos = ref<string[]>([])
const paso = ref<Paso>("hojas")
const progreso = ref(0)
const lote = shallowRef<Lote | null>(null)
const guardadas = shallowRef<FilaGuardada[]>([])
const archivosLote = shallowRef<PeticionImportacion["archivos"]>([])
const resultado = shallowRef<Importacion | null>(null)
const reanalizando = ref<string | null>(null)
const arrastrando = ref(false)
const entrada = ref<HTMLInputElement>()
const catalogo = shallowRef<ColumnaCatalogo[] | null>(null)
const ignoradas = ref<string[]>([])
/** Paso desde el que se llegó a «guardando», para volver allí si falla. */
const pasoPrevio = ref<Paso>("decidir")

onMounted(async () => {
  const [c, ig] = await Promise.allSettled([
    s.datos.columnas(token.value),
    s.ingesta.columnasIgnoradas(token.value),
  ])
  if (c.status === "fulfilled") catalogo.value = c.value
  if (ig.status === "fulfilled") ignoradas.value = ig.value
})
// Libera la memoria del worker al salir de la pantalla.
onBeforeUnmount(() => archivos.forEach((_, id) => void olvidarArchivo(id).catch(() => {})))

const incluidas = computed(() => hojas.value.filter((h) => h.incluir))
const bloqueos = computed(() =>
  incluidas.value.flatMap((h) => problemasMapeo(h.mapeo, h.tipoPlanilla)),
)
const idsArchivo = computed(() => [...new Set(hojas.value.map((h) => h.archivoId))])
const hojasDe = (id: string) => hojas.value.filter((h) => h.archivoId === id)
const varias = (id: string) => hojasDe(id).length > 1
const totalFilas = computed(() =>
  incluidas.value.reduce((n, h) => n + h.analisis.totalFilas, 0).toLocaleString("es-CL"),
)
const aceptar = EXTENSIONES_PERMITIDAS.map((e) => `.${e}`)

/** Mapeo sugerido de una hoja, con las columnas ignoradas permanentemente ya marcadas. */
function elegida(archivoId: string, archivo: string, analisis: AnalisisHoja): Omit<HojaElegida, "incluir"> {
  const mapeo = aplicarIgnoradas(analisis.mapeo, ignoradas.value)
  return {
    archivoId,
    archivo,
    analisis,
    mapeo,
    tipoPlanilla: mapeo === analisis.mapeo ? analisis.tipoPlanilla : detectarTipoPlanilla(mapeo),
  }
}

async function agregar(lista: FileList | File[]) {
  const nuevos: string[] = []
  const aceptados = [...lista].filter((f) => {
    const motivo =
      validarArchivo(f) ??
      (hojas.value.some((h) => h.archivo === f.name) || leyendo.value.includes(f.name)
        ? `«${f.name}» ya está en la lista.`
        : null)
    if (motivo) nuevos.push(motivo)
    return !motivo
  })
  rechazos.value = nuevos
  leyendo.value = [...leyendo.value, ...aceptados.map((f) => f.name)]
  await Promise.all(
    aceptados.map(async (f) => {
      try {
        const a = await analizarArchivo(f)
        archivos.set(a.archivoId, f)
        hojas.value = [
          ...hojas.value,
          ...a.hojas.map((hoja) => ({
            ...elegida(a.archivoId, a.nombre, hoja),
            incluir: hoja.totalFilas > 0,
          })),
        ]
      } catch (e) {
        rechazos.value = [...rechazos.value, `«${f.name}»: ${mensajeError(e)}`]
      } finally {
        leyendo.value = leyendo.value.filter((n) => n !== f.name)
      }
    }),
  )
}

function quitarArchivo(id: string) {
  hojas.value = hojas.value.filter((x) => x.archivoId !== id)
  archivos.delete(id)
  void olvidarArchivo(id).catch(() => {})
}

const reemplazar = (h: HojaElegida, n: HojaElegida) =>
  (hojas.value = hojas.value.map((x) =>
    x.archivoId === h.archivoId && x.analisis.nombre === h.analisis.nombre ? n : x,
  ))

function incluirTodas(id: string, incluir: boolean) {
  hojas.value = hojas.value.map((h) => (h.archivoId === id ? { ...h, incluir } : h))
}

async function cambiarEncabezado(h: HojaElegida, fila: number) {
  const clave = `${h.archivoId}/${h.analisis.nombre}`
  reanalizando.value = clave
  try {
    const analisis = await reanalizarHoja(h.archivoId, h.analisis.nombre, fila)
    reemplazar(h, { ...elegida(h.archivoId, h.archivo, analisis), incluir: h.incluir })
  } catch (e) {
    informar(e, "No se pudo releer la hoja")
  } finally {
    reanalizando.value = null
  }
}

async function guardarIgnoradas(lista: string[], aviso: string) {
  try {
    ignoradas.value = await s.ingesta.fijarColumnasIgnoradas(token.value, lista)
    // Aplica la lista a las hojas abiertas sin tocar las columnas que el usuario ya cambió.
    hojas.value = hojas.value.map((h) => {
      const mapeo = aplicarIgnoradas(h.mapeo, ignoradas.value)
      return mapeo === h.mapeo ? h : { ...h, mapeo, tipoPlanilla: detectarTipoPlanilla(mapeo) }
    })
    notificar({ tono: "exito", titulo: aviso })
  } catch (e) {
    informar(e, "No se pudo guardar la configuración")
  }
}
const ignorarSiempre = (encabezado: string) =>
  guardarIgnoradas(
    [...ignoradas.value, encabezado],
    `«${encabezado}» se ignorará en las próximas cargas`,
  )
const restaurarIgnorada = (encabezado: string) =>
  guardarIgnoradas(
    ignoradas.value.filter((x) => x !== encabezado),
    `«${encabezado}» volverá a ofrecerse para importar`,
  )

async function procesar() {
  paso.value = "procesando"
  progreso.value = 0
  try {
    let filas: FilaProcesada[] = []
    const resumen: PeticionImportacion["archivos"] = []
    const lista = incluidas.value
    for (const [i, h] of lista.entries()) {
      const r = await procesarHoja(
        h.archivoId,
        h.analisis.nombre,
        h.analisis.filaEncabezado,
        h.mapeo,
        h.tipoPlanilla,
        (x) => (progreso.value = (i + x) / lista.length),
      )
      filas = filas.concat(r)
      resumen.push({
        nombre: varias(h.archivoId) ? `${h.archivo} (${h.analisis.nombre})` : h.archivo,
        tipoPlanilla: h.tipoPlanilla,
        filas: r.length,
      })
    }
    if (!filas.length) {
      notificar({
        tono: "peligro",
        titulo: "No se encontraron filas con datos",
        detalle: "Revise la fila de títulos elegida.",
      })
      paso.value = "hojas"
      return
    }
    const claves = [
      ...new Set(
        filas
          .filter((f) => !tieneErrores(f))
          .map((f) => claveDuplicado(f))
          .filter((k): k is string => !!k),
      ),
    ]
    guardadas.value = await s.datos.buscarPorClaves(token.value, claves)
    lote.value = clasificar(filas, guardadas.value)
    archivosLote.value = resumen
    paso.value = "decidir"
  } catch (e) {
    informar(e, "No se pudieron leer las planillas")
    paso.value = "hojas"
  }
}

/**
 * Reemplaza (o quita) una fila con error y vuelve a clasificar el lote: la fila corregida puede ser
 * duplicada de otra. Las decisiones ya tomadas se conservan por fila.
 */
function reclasificar(uid: string, corregida: FilaProcesada | null) {
  const l = lote.value
  if (!l) return
  const previas = new Map(l.duplicados.map((d) => [l.validas[d.indice].uid, d]))
  const filas = [...l.validas, ...l.conError.filter((f) => f.uid !== uid)]
  if (corregida) filas.push(corregida)
  const nuevo = clasificar(filas, guardadas.value)
  nuevo.duplicados = nuevo.duplicados.map((d) => {
    const previa = previas.get(nuevo.validas[d.indice].uid)
    return previa ? { ...d, accion: previa.accion, combinada: previa.combinada } : d
  })
  lote.value = nuevo
}
function corregir(uid: string, fila: FilaProcesada) {
  reclasificar(uid, fila)
  notificar({ tono: "exito", titulo: `Fila ${fila.numero} corregida`, detalle: "Se guardará con el resto." })
}
const descartarError = (uid: string) => reclasificar(uid, null)

async function confirmar(despues = false) {
  const l = lote.value
  if (!l) return
  pasoPrevio.value = paso.value
  paso.value = "guardando"
  // «Revisar después»: todo duplicado queda pendiente y los errores pasan a Datos › Con errores.
  const definitivo: Lote = despues
    ? { ...l, duplicados: l.duplicados.map((d) => ({ ...d, accion: "decidir_despues", combinada: undefined })) }
    : l
  const ids = new Set(incluidas.value.map((h) => h.archivoId))
  const originales = [...archivos]
    .filter(([id]) => ids.has(id))
    .map(([, f]) => ({ nombre: f.name, contenido: f as Blob }))
  try {
    resultado.value = await s.ingesta.confirmar(
      token.value,
      armarPeticion(definitivo, archivosLote.value, columnasExtraDe(incluidas.value.map((h) => h.mapeo))),
      originales,
    )
    paso.value = "listo"
    avisarCambioDatos()
  } catch (e) {
    informar(e, "No se pudo guardar la importación")
    paso.value = pasoPrevio.value
  }
}

function reiniciar() {
  idsArchivo.value.forEach(quitarArchivo)
  hojas.value = []
  lote.value = null
  resultado.value = null
  rechazos.value = []
  paso.value = "hojas"
}

function soltar(e: DragEvent) {
  arrastrando.value = false
  if (e.dataTransfer?.files.length) void agregar(e.dataTransfer.files)
}
function elegirArchivos(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) void agregar(input.files)
  input.value = ""
}

const PASOS = ["Archivos y hojas", "Revisión", "Listo"]
const indicePaso = computed(() =>
  paso.value === "listo" ? 2 : paso.value === "hojas" || paso.value === "procesando" ? 0 : 1,
)
const sinPendientes = computed(
  () => !!lote.value && !lote.value.conError.length && !lote.value.duplicados.length,
)
</script>

<template>
  <div class="animar-aparecer mx-auto max-w-5xl">
    <EncabezadoPagina
      titulo="Cargar planillas"
      descripcion="Importe las planillas exportadas desde PhilaxMed. Nada se guarda hasta que confirme."
    />

    <ol class="mb-6 flex items-center gap-2 text-[13px]" aria-label="Pasos">
      <li v-for="(etiqueta, i) in PASOS" :key="etiqueta" class="flex items-center gap-2">
        <span v-if="i > 0" :class="cn('h-px w-6 sm:w-10', i <= indicePaso ? 'bg-acento' : 'bg-borde')" />
        <span
          :class="
            cn(
              'flex size-6 items-center justify-center rounded-full text-[12px] font-semibold',
              i < indicePaso
                ? 'bg-acento text-sobre-acento'
                : i === indicePaso
                  ? 'bg-acento-tenue text-acento ring-1 ring-acento'
                  : 'bg-superficie-3 text-tenue',
            )
          "
        >
          <CheckCircle2 v-if="i < indicePaso" class="size-3.5" aria-hidden="true" />
          <template v-else>{{ i + 1 }}</template>
        </span>
        <span
          :class="cn(i === indicePaso ? 'font-medium text-texto' : 'text-tenue', 'hidden sm:inline')"
          :aria-current="i === indicePaso ? 'step' : undefined"
        >
          {{ etiqueta }}
        </span>
      </li>
    </ol>

    <div v-if="paso === 'hojas' || paso === 'procesando'" class="space-y-5">
      <div
        :class="
          cn(
            'rounded-2xl border-2 border-dashed px-6 transition-colors',
            hojas.length ? 'py-5' : 'py-14',
            arrastrando ? 'border-acento bg-acento-tenue' : 'border-borde-fuerte bg-superficie',
          )
        "
        @dragover.prevent="arrastrando = true"
        @dragleave="arrastrando = false"
        @drop.prevent="soltar"
      >
        <div :class="cn('flex items-center gap-4', hojas.length ? 'flex-row' : 'flex-col text-center')">
          <span
            :class="
              cn(
                'flex shrink-0 items-center justify-center rounded-2xl bg-acento-tenue text-acento',
                hojas.length ? 'size-10' : 'size-14',
              )
            "
          >
            <Upload :class="hojas.length ? 'size-5' : 'size-6'" aria-hidden="true" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-[15px] font-semibold">
              {{ hojas.length ? "¿Más planillas?" : "Arrastre aquí sus planillas" }}
            </p>
            <p class="text-[13px] text-tenue">
              {{ aceptar.join(", ") }} · hasta {{ LIMITE_ARCHIVO_MB }} MB cada una · puede elegir varias
            </p>
          </div>
          <Boton
            :variante="hojas.length ? 'secundario' : 'primario'"
            :disabled="paso === 'procesando'"
            @click="entrada?.click()"
          >
            Elegir archivos
          </Boton>
          <input ref="entrada" type="file" multiple hidden :accept="aceptar.join(',')" @change="elegirArchivos" />
        </div>
      </div>

      <Aviso
        v-if="rechazos.length"
        tono="peligro"
        :titulo="rechazos.length === 1 ? 'Un archivo no se pudo agregar' : `${rechazos.length} archivos no se pudieron agregar`"
      >
        <ul class="mt-1 space-y-0.5">
          <li v-for="r in rechazos" :key="r">{{ r }}</li>
        </ul>
      </Aviso>

      <Tarjeta v-for="n in leyendo" :key="n" class="flex items-center gap-3" role="status">
        <span class="size-4 animate-spin rounded-full border-2 border-acento border-t-transparent" />
        <span class="text-[13.5px]">Leyendo «{{ n }}»…</span>
      </Tarjeta>

      <section
        v-for="id in idsArchivo"
        :key="id"
        class="relative rounded-2xl border-2 border-borde-fuerte bg-superficie-2/40 p-3 sm:p-4"
        :aria-label="`Archivo ${hojasDe(id)[0]?.archivo}`"
      >
        <div v-if="varias(id)" class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
          <p class="min-w-0 flex-1 truncate text-[14.5px] font-semibold">
            {{ hojasDe(id)[0]?.archivo }}
            <span class="font-normal text-tenue">
              · {{ hojasDe(id).filter((h) => h.incluir).length }} de {{ hojasDe(id).length }} hojas para importar
            </span>
          </p>
          <Boton tamano="sm" variante="fantasma" :disabled="paso === 'procesando'" @click="incluirTodas(id, true)">
            Todas
          </Boton>
          <Boton tamano="sm" variante="fantasma" :disabled="paso === 'procesando'" @click="incluirTodas(id, false)">
            Ninguna
          </Boton>
        </div>
        <div class="space-y-4">
          <MapeoHoja
            v-for="h in hojasDe(id)"
            :key="`${id}/${h.analisis.nombre}`"
            :hoja="h"
            :varias="varias(id)"
            :ignoradas="ignoradas"
            :ocupada="reanalizando === `${id}/${h.analisis.nombre}` || paso === 'procesando'"
            @cambiar="reemplazar(h, $event)"
            @cambiar-encabezado="cambiarEncabezado(h, $event)"
            @ignorar-siempre="ignorarSiempre"
          />
          <button
            v-if="paso === 'hojas'"
            type="button"
            class="absolute -top-3 -right-3 flex size-7 items-center justify-center rounded-full border border-borde bg-superficie text-tenue shadow-sm hover:text-peligro"
            :aria-label="`Quitar ${hojasDe(id)[0]?.archivo}`"
            @click="quitarArchivo(id)"
          >
            <X class="size-3.5" />
          </button>
        </div>
      </section>

      <Detalles
        v-if="ignoradas.length"
        :resumen="`Columnas que siempre se ignoran (${ignoradas.length})`"
      >
        <p class="mb-2 text-[12.5px] text-tenue">
          Se marcan como «No importar» al leer cualquier planilla. Puede volver a importarlas cuando quiera.
        </p>
        <ul class="flex flex-wrap gap-2">
          <li
            v-for="c in ignoradas"
            :key="c"
            class="flex items-center gap-1 rounded-full border border-borde bg-superficie py-0.5 pr-1 pl-3 text-[12.5px]"
          >
            {{ c }}
            <button
              type="button"
              class="flex size-6 items-center justify-center rounded-full text-tenue hover:bg-superficie-3 hover:text-texto"
              :aria-label="`Volver a importar «${c}»`"
              :title="`Volver a importar «${c}»`"
              @click="restaurarIgnorada(c)"
            >
              <RotateCcw class="size-3.5" />
            </button>
          </li>
        </ul>
      </Detalles>

      <div
        v-if="hojas.length"
        class="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-borde bg-superficie/95 px-5 py-3.5 shadow-lg backdrop-blur"
      >
        <div v-if="paso === 'procesando'" class="flex-1" role="status">
          <p class="mb-1.5 text-[13px]">Leyendo y validando filas… {{ Math.round(progreso * 100) }}%</p>
          <div class="h-1.5 overflow-hidden rounded-full bg-superficie-3">
            <div
              class="h-full rounded-full bg-acento transition-[width]"
              :style="{ width: `${Math.max(4, progreso * 100)}%` }"
            />
          </div>
        </div>
        <template v-else>
          <p class="text-[13px] text-suave">
            <template v-if="incluidas.length">
              {{ incluidas.length }} {{ incluidas.length === 1 ? "hoja" : "hojas" }} · {{ totalFilas }} filas
            </template>
            <template v-else>Marque al menos una hoja para importar.</template>
            <span v-if="bloqueos.length" class="text-peligro"> · Corrija las columnas marcadas</span>
          </p>
          <Boton
            variante="primario"
            :disabled="!incluidas.length || bloqueos.length > 0 || leyendo.length > 0"
            @click="procesar"
          >
            Revisar filas
          </Boton>
        </template>
      </div>
    </div>

    <template v-else-if="lote && (paso === 'decidir' || (paso === 'guardando' && pasoPrevio === 'decidir'))">
      <DecisionRevision
        :lote="lote"
        :hojas="archivosLote.length"
        :guardando="paso === 'guardando'"
        @revisar="paso = 'revisar'"
        @importar-despues="confirmar(true)"
        @volver="paso = 'hojas'"
      />
      <div v-if="sinPendientes" class="mt-5 flex justify-end">
        <Boton variante="primario" :cargando="paso === 'guardando'" @click="confirmar()">
          Confirmar importación
        </Boton>
      </div>
    </template>

    <RevisionLote
      v-else-if="lote && (paso === 'revisar' || paso === 'guardando')"
      v-model="lote"
      :catalogo="catalogo"
      :guardando="paso === 'guardando'"
      @corregir="corregir"
      @descartar-error="descartarError"
      @confirmar="confirmar()"
      @volver="paso = 'decidir'"
    />

    <ResultadoCarga v-else-if="paso === 'listo' && resultado" :imp="resultado" @reiniciar="reiniciar" />
  </div>
</template>

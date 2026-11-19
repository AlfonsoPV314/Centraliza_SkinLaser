<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef } from "vue"
import { Eye, FileSpreadsheet, FileText, LoaderCircle } from "@lucide/vue"
import { mensajeError, useServicios, useUsuario } from "@/application"
import type { ArchivoGenerado, PeticionReporte } from "@/contracts/reportes"
import { Boton, Dialogo, cn } from "@/shared/ui"

const MAX_FILAS = 100

interface Hoja {
  nombre: string
  filas: string[][]
  total: number
}
interface Vista {
  archivo: ArchivoGenerado
  url?: string
  hojas?: Hoja[]
}

const p = defineProps<{ peticion: PeticionReporte; deshabilitado?: boolean }>()
const s = useServicios()
const { token } = useUsuario()

const abierto = ref(false)
const cargando = ref(false)
const paso = ref("")
const error = ref("")
const vistas = shallowRef<Vista[]>([])
const actual = ref(0)
const hoja = ref(0)
let turno = 0

const vista = computed(() => vistas.value[actual.value])
const hojaActual = computed(() => vista.value?.hojas?.[hoja.value])

function limpiar() {
  for (const v of vistas.value) if (v.url) URL.revokeObjectURL(v.url)
  vistas.value = []
}
onBeforeUnmount(limpiar)

async function leerExcel(blob: Blob): Promise<Hoja[]> {
  const XLSX = await import("xlsx")
  const libro = XLSX.read(await blob.arrayBuffer(), { type: "array" })
  return libro.SheetNames.map((nombre) => {
    const todas = XLSX.utils.sheet_to_json<unknown[]>(libro.Sheets[nombre], {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    })
    return {
      nombre,
      total: todas.length,
      filas: todas.slice(0, MAX_FILAS).map((f) => f.map((c) => String(c ?? ""))),
    }
  })
}

async function abrir() {
  const mio = ++turno
  abierto.value = true
  cargando.value = true
  error.value = ""
  paso.value = ""
  actual.value = 0
  hoja.value = 0
  limpiar()
  try {
    const generados = await s.reportes.previsualizar(token.value, p.peticion, (x) => mio === turno && (paso.value = x))
    const nuevas: Vista[] = []
    for (const archivo of generados) {
      nuevas.push(
        archivo.formato === "pdf"
          ? { archivo, url: URL.createObjectURL(archivo.contenido) }
          : { archivo, hojas: await leerExcel(archivo.contenido) },
      )
    }
    if (mio !== turno) {
      for (const v of nuevas) if (v.url) URL.revokeObjectURL(v.url)
      return
    }
    vistas.value = nuevas
  } catch (e) {
    if (mio === turno) error.value = mensajeError(e)
  } finally {
    if (mio === turno) cargando.value = false
  }
}

function cerrar() {
  turno++
  abierto.value = false
  cargando.value = false
  limpiar()
}
</script>

<template>
  <div class="mt-4 border-t border-borde pt-4">
    <Boton class="w-full" :icono="Eye" :disabled="deshabilitado" @click="abrir">Previsualizar archivos</Boton>

    <Dialogo
      :abierto="abierto"
      ancho="xl"
      titulo="Previsualización"
      descripcion="Así quedarán los archivos con el período y los filtros actuales. Todavía no se ha generado ni guardado nada."
      @cerrar="cerrar"
    >
      <div v-if="cargando" class="flex items-center gap-2 py-16 text-[13px] text-suave" role="status">
        <LoaderCircle class="size-4 animate-spin text-acento" aria-hidden="true" />
        {{ paso || "Preparando la previsualización…" }}
      </div>
      <p v-else-if="error" class="py-8 text-[13px] text-peligro" role="alert">{{ error }}</p>
      <template v-else-if="vista">
        <div class="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Archivos">
          <button
            v-for="(v, i) in vistas"
            :key="v.archivo.nombre"
            type="button"
            role="tab"
            :aria-selected="actual === i"
            :class="
              cn(
                'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] transition-colors',
                actual === i
                  ? 'border-acento bg-acento-tenue font-medium text-acento'
                  : 'border-borde text-suave hover:border-borde-fuerte hover:text-texto',
              )
            "
            @click="((actual = i), (hoja = 0))"
          >
            <FileSpreadsheet v-if="v.archivo.formato === 'excel'" class="size-4" aria-hidden="true" />
            <FileText v-else class="size-4" aria-hidden="true" />
            {{ v.archivo.nombre }}
          </button>
        </div>

        <iframe v-if="vista.url" :src="vista.url" :title="vista.archivo.nombre" class="h-[65vh] w-full rounded border border-borde" />

        <template v-else-if="vista.hojas">
          <div v-if="vista.hojas.length > 1" class="mb-2 flex flex-wrap gap-1.5">
            <button
              v-for="(h, i) in vista.hojas"
              :key="h.nombre"
              type="button"
              :aria-pressed="hoja === i"
              :class="cn('rounded-full border px-3 py-1 text-[12.5px]', hoja === i ? 'border-acento bg-acento text-sobre-acento' : 'border-borde text-suave')"
              @click="hoja = i"
            >
              {{ h.nombre }}
            </button>
          </div>
          <div v-if="hojaActual" class="max-h-[60vh] overflow-auto rounded border border-borde">
            <table class="w-full text-[12px]">
              <tbody>
                <tr v-for="(f, i) in hojaActual.filas" :key="i" :class="i === 0 ? 'sticky top-0 bg-superficie-2 font-medium' : ''">
                  <td v-for="(c, j) in f" :key="j" class="whitespace-nowrap border-b border-borde px-2 py-1">{{ c }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="hojaActual" class="mt-1.5 text-[12px] text-tenue">
            <template v-if="hojaActual.total > MAX_FILAS">
              Mostrando las primeras {{ MAX_FILAS }} de {{ hojaActual.total.toLocaleString("es-CL") }} filas.
            </template>
            <template v-else>{{ hojaActual.total.toLocaleString("es-CL") }} filas.</template>
            Es una vista de los datos; los gráficos y el formato solo se ven al abrir el archivo en Excel.
          </p>
        </template>
      </template>

      <template #pie>
        <Boton @click="cerrar">Cerrar</Boton>
      </template>
    </Dialogo>
  </div>
</template>
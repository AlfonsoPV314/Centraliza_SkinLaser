<script setup lang="ts">
import { ref, shallowRef } from "vue"
import { ArrowRight, Download, History, Undo2 } from "@lucide/vue"
import { avisarCambioDatos, useInformarError, useServicios, useUsuario, useNotificar } from "@/application"
import type { Importacion } from "@/contracts"
import { formatearFecha } from "@/domain/dates"
import { useCarga } from "@/shared/hooks"
import { resumenConteos, tiempoRelativo } from "@/shared/presentacion"
import { Boton, Dialogo, Insignia, Tarjeta, cn } from "@/shared/ui"
import EstadoLista from "./EstadoLista.vue"

const s = useServicios()
const { token } = useUsuario()
const notificar = useNotificar()
const informar = useInformarError()
const lista = useCarga(() => s.ingesta.listar(token.value, 50), [token])
const deshaciendo = shallowRef<Importacion | null>(null)
const ocupado = ref(false)
const descargando = ref<string | null>(null)

async function deshacer() {
  if (!deshaciendo.value) return
  ocupado.value = true
  try {
    await s.ingesta.deshacer(token.value, deshaciendo.value.id)
    notificar({
      tono: "exito",
      titulo: "Importación deshecha",
      detalle: "Los datos volvieron a como estaban antes de esa carga.",
    })
    deshaciendo.value = null
    avisarCambioDatos()
    await lista.recargar(true)
  } catch (e) {
    informar(e, "No se pudo deshacer")
  } finally {
    ocupado.value = false
  }
}

async function descargar(imp: Importacion, nombre: string) {
  descargando.value = `${imp.id}/${nombre}`
  try {
    const a = await s.ingesta.descargarOriginal(token.value, imp.id, nombre)
    const url = URL.createObjectURL(a.contenido)
    const enlace = document.createElement("a")
    enlace.href = url
    enlace.download = a.nombre
    enlace.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (e) {
    informar(e, "No se pudo descargar el archivo")
  } finally {
    descargando.value = null
  }
}
</script>

<template>
  <EstadoLista
    :cargando="lista.cargando.value && !lista.datos.value"
    :error="lista.error.value"
    :vacia="!lista.datos.value?.length"
    titulo-vacio="Aún no hay cargas"
    :icono-vacio="History"
    @reintentar="lista.recargar()"
  >
    <template #vacio>Cada vez que confirme una carga de planillas, quedará registrada aquí.</template>
    <ol class="relative space-y-3 border-l border-borde pl-5">
      <li v-for="imp in lista.datos.value" :key="imp.id" class="relative">
        <span
          :class="
            cn(
              'absolute top-5 -left-[26px] size-2.5 rounded-full ring-4 ring-fondo',
              imp.estado === 'activa' ? 'bg-acento' : 'bg-borde-fuerte',
            )
          "
          aria-hidden="true"
        />
        <Tarjeta :class="imp.estado === 'deshecha' ? 'opacity-60' : undefined">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="text-[14px] font-semibold">{{ imp.archivos.map((a) => a.nombre).join(", ") }}</p>
              <p class="text-[12.5px] text-tenue">
                {{ imp.usuario }} · {{ formatearFecha(imp.creadaEn) }} ({{ tiempoRelativo(imp.creadaEn) }})
              </p>
              <p class="mt-2 text-[13px] text-suave">{{ resumenConteos(imp.conteos) }}</p>
              <div v-if="imp.originales.length" class="mt-2 flex flex-wrap gap-1.5">
                <Boton
                  v-for="n in imp.originales"
                  :key="n"
                  tamano="sm"
                  variante="fantasma"
                  :icono="Download"
                  :cargando="descargando === `${imp.id}/${n}`"
                  :aria-label="`Descargar el archivo original ${n}`"
                  @click="descargar(imp, n)"
                >
                  <span class="max-w-56 truncate">{{ n }}</span>
                </Boton>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Insignia v-if="imp.estado === 'deshecha'">Deshecha</Insignia>
              <Insignia v-else tono="exito">Activa</Insignia>
              <Boton
                v-if="imp.estado === 'activa' && imp.sePuedeDeshacer"
                tamano="sm"
                :icono="Undo2"
                @click="deshaciendo = imp"
              >
                Deshacer
              </Boton>
            </div>
          </div>
        </Tarjeta>
      </li>
    </ol>
  </EstadoLista>
  <Dialogo
    :abierto="!!deshaciendo"
    ancho="sm"
    titulo="¿Deshacer esta importación?"
    descripcion="Se quitarán las filas que agregó, se restaurarán las que reemplazó y se borrarán sus pendientes de revisión."
    :cerrable="!ocupado"
    @cerrar="deshaciendo = null"
  >
    <template #pie>
      <Boton :disabled="ocupado" @click="deshaciendo = null">Cancelar</Boton>
      <Boton variante="peligro" :cargando="ocupado" :icono="ArrowRight" @click="deshacer">Deshacer</Boton>
    </template>
  </Dialogo>
</template>

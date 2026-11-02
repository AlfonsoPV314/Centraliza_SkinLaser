<script setup lang="ts">
import { computed, ref } from "vue"
import { Bell, TriangleAlert, Upload } from "@lucide/vue"
import type { EstadoDatos, Importacion } from "@/contracts"
import { formatearMarcaTiempo } from "@/domain/dates"
import { plural } from "@/domain/format"
import { useClickFuera } from "@/shared/hooks"
import { Insignia, cn } from "@/shared/ui"

const p = defineProps<{ estado: EstadoDatos | null; importaciones: Importacion[] }>()
const abierto = ref(false)
const raiz = ref<HTMLDivElement>()
useClickFuera(raiz, () => (abierto.value = false), abierto)

const items = computed(() => {
  const e = p.estado
  const l: { titulo: string; detalle: string; ruta: string; tono: "peligro" | "aviso" | "info" }[] = []
  if (e?.filasConError)
    l.push({
      titulo: `${plural(e.filasConError, "fila")} con errores`,
      detalle: "Corríjalas para incluirlas en los reportes.",
      ruta: "/datos?pestana=errores",
      tono: "peligro",
    })
  if (e?.duplicadosPendientes)
    l.push({
      titulo: `${plural(e.duplicadosPendientes, "posible duplicado", "posibles duplicados")} por decidir`,
      detalle: "Elija qué valores conservar.",
      ruta: "/datos?pestana=duplicados",
      tono: "aviso",
    })
  if (e?.pacientesIncompletos)
    l.push({
      titulo: `${plural(e.pacientesIncompletos, "paciente")} con datos incompletos`,
      detalle: "Faltan atributos base como previsión o dirección.",
      ruta: "/datos?pestana=incompletos",
      tono: "info",
    })
  return l
})
const total = computed(() => (p.estado?.filasConError ?? 0) + (p.estado?.duplicadosPendientes ?? 0))
const COLOR = { peligro: "text-peligro", aviso: "text-aviso", info: "text-info" }
</script>

<template>
  <div ref="raiz" class="relative">
    <button
      type="button"
      class="relative flex size-9 items-center justify-center rounded-lg text-suave hover:bg-superficie-2 hover:text-texto"
      :aria-label="`Notificaciones${total ? `, ${total} pendientes` : ''}`"
      :aria-expanded="abierto"
      @click="abierto = !abierto"
    >
      <Bell class="size-[18px]" />
      <span v-if="total > 0" class="absolute top-2 right-2 size-2 rounded-full bg-aviso ring-2 ring-fondo" />
    </button>
    <div
      v-if="abierto"
      class="animar-aparecer absolute right-0 z-40 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-borde bg-superficie shadow-2xl"
    >
      <p class="border-b border-borde px-4 py-3 text-sm font-semibold">Pendientes</p>
      <p v-if="items.length === 0" class="px-4 py-6 text-center text-[13px] text-suave">
        Todo al día. No hay filas por revisar.
      </p>
      <ul v-else class="p-1.5">
        <li v-for="i in items" :key="i.ruta">
          <RouterLink :to="i.ruta" class="flex gap-3 rounded-lg p-2.5 hover:bg-superficie-2" @click="abierto = false">
            <TriangleAlert :class="cn('mt-0.5 size-4 shrink-0', COLOR[i.tono])" />
            <span>
              <span class="block text-[13.5px] font-medium">{{ i.titulo }}</span>
              <span class="block text-[12.5px] text-suave">{{ i.detalle }}</span>
            </span>
          </RouterLink>
        </li>
      </ul>
      <template v-if="importaciones.length">
        <p class="border-t border-borde px-4 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-tenue uppercase">
          Últimas cargas
        </p>
        <ul class="px-1.5 pb-1.5">
          <li v-for="imp in importaciones.slice(0, 3)" :key="imp.id">
            <RouterLink
              to="/datos?pestana=historial"
              class="flex items-center gap-3 rounded-lg p-2.5 hover:bg-superficie-2"
              @click="abierto = false"
            >
              <Upload class="size-4 shrink-0 text-tenue" />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[13px]">{{ imp.archivos.map((a) => a.nombre).join(", ") }}</span>
                <span class="block text-[12px] text-tenue">{{ formatearMarcaTiempo(imp.creadaEn) }} · {{ imp.usuario }}</span>
              </span>
              <Insignia v-if="imp.estado === 'deshecha'">Deshecha</Insignia>
            </RouterLink>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { Activity, RefreshCw } from "@lucide/vue"
import { mensajeError, useServicios, useUsuario } from "@/application"
import type { TipoEvento } from "@/contracts"
import { formatearMarcaTiempo } from "@/domain/dates"
import { useCarga } from "@/shared/hooks"
import { tiempoRelativo } from "@/shared/presentacion"
import { Boton, Esqueleto, Insignia, Paginacion, Selector, Tarjeta, Vacio, type Tono } from "@/shared/ui"

const POR_PAGINA = 15
const TIPOS: Record<TipoEvento, { etiqueta: string; tono: Tono }> = {
  ingreso: { etiqueta: "Ingreso", tono: "neutro" },
  usuario: { etiqueta: "Usuarios", tono: "acento" },
  importacion: { etiqueta: "Carga", tono: "info" },
  deshacer: { etiqueta: "Deshacer", tono: "aviso" },
  datos: { etiqueta: "Datos", tono: "info" },
  reporte: { etiqueta: "Reporte", tono: "exito" },
  configuracion: { etiqueta: "Configuración", tono: "neutro" },
}

const s = useServicios()
const { token } = useUsuario()
const tipo = ref<TipoEvento | "">("")
const pagina = ref(1)
const lista = useCarga(
  () => s.auditoria.listar(token.value, tipo.value || null, { pagina: pagina.value, porPagina: POR_PAGINA }),
  [tipo, pagina],
)
</script>

<template>
  <div>
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p class="text-[13px] text-suave">Registro de acciones importantes (MS Auditoría). Solo lectura.</p>
      <Selector
        :model-value="tipo"
        tamano="sm"
        class="w-44"
        aria-label="Filtrar por tipo"
        @update:model-value="(v) => ((tipo = (v as TipoEvento) || ''), (pagina = 1))"
      >
        <option value="">Todas las acciones</option>
        <option v-for="(t, k) in TIPOS" :key="k" :value="k">{{ t.etiqueta }}</option>
      </Selector>
    </div>
    <Tarjeta :relleno="false" class="overflow-hidden">
      <div v-if="lista.cargando.value && !lista.datos.value" class="space-y-2 p-4">
        <Esqueleto v-for="i in 5" :key="i" class="h-9" />
      </div>
      <Vacio v-else-if="lista.error.value" titulo="No pudimos cargar la actividad">
        {{ mensajeError(lista.error.value) }}
        <template #accion><Boton :icono="RefreshCw" @click="lista.recargar()">Reintentar</Boton></template>
      </Vacio>
      <Vacio v-else-if="!lista.datos.value?.items.length" :icono="Activity" titulo="Sin actividad registrada" />
      <ul v-else class="divide-y divide-borde text-[13px]">
        <li v-for="e in lista.datos.value.items" :key="e.id" class="flex items-center gap-3 px-4 py-2">
          <Insignia :tono="TIPOS[e.tipo].tono" class="w-24 shrink-0 justify-center">{{ TIPOS[e.tipo].etiqueta }}</Insignia>
          <p class="min-w-0 flex-1 truncate">
            <span class="font-medium">{{ e.usuario }}</span>
            <span class="text-suave"> · {{ e.accion }}</span>
            <span v-if="e.detalle" class="text-tenue"> · {{ e.detalle }}</span>
          </p>
          <time :datetime="e.creadoEn" :title="formatearMarcaTiempo(e.creadoEn)" class="shrink-0 text-[12px] text-tenue">
            {{ tiempoRelativo(e.creadoEn) }}
          </time>
        </li>
      </ul>
    </Tarjeta>
    <Paginacion
      v-if="lista.datos.value"
      v-model="pagina"
      class="mt-4"
      :total="lista.datos.value.total"
      :por-pagina="POR_PAGINA"
    />
  </div>
</template>

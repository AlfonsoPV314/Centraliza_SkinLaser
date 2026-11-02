<script setup lang="ts">
import { ref, shallowRef } from "vue"
import { Database, Search } from "@lucide/vue"
import { mensajeError, useCambiosDatos, useServicios, useUsuario } from "@/application"
import { formatearFecha } from "@/domain/dates"
import { formatearCLP } from "@/domain/format"
import type { ColumnaCatalogo, FilaGuardada } from "@/domain/model"
import { useCarga, useRetardo } from "@/shared/hooks"
import { tiempoRelativo } from "@/shared/presentacion"
import { Boton, Dialogo, Entrada, Esqueleto, Paginacion, Tarjeta, Vacio, cn } from "@/shared/ui"
import { etiquetaDe, mostrarValor, tipoDe } from "../valores"

defineProps<{ catalogo: ColumnaCatalogo[] | null }>()
const s = useServicios()
const { token, usuario } = useUsuario()
const q = ref("")
const pagina = ref(1)
const busqueda = useRetardo(q)
const porPagina = () => usuario.value.preferencias.porPagina
const lista = useCarga(
  () => s.datos.listarFilas(token.value, busqueda.value, { pagina: pagina.value, porPagina: porPagina() }),
  [token, busqueda, pagina, porPagina],
)
const detalle = shallowRef<FilaGuardada | null>(null)
useCambiosDatos(() => lista.recargar(true))

const buscar = (v: string) => {
  q.value = v
  pagina.value = 1
}
const nombre = (f: FilaGuardada) =>
  f.campos.nombre_completo?.o ||
  [f.campos.nombres?.o, f.campos.apellido_paterno?.o].filter(Boolean).join(" ")
</script>

<template>
  <div class="mb-4 max-w-md">
    <Entrada
      :model-value="q"
      placeholder="Buscar por RUN, nombre, prestación o archivo"
      aria-label="Buscar registros"
      :prefijo="Search"
      @update:model-value="buscar(String($event ?? ''))"
    />
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
      :titulo="q ? 'Ningún registro coincide' : 'Aún no hay datos guardados'"
    >
      {{ q ? "Pruebe con otra búsqueda." : "Cargue sus planillas de PhilaxMed para empezar." }}
    </Vacio>
    <div v-else :class="cn('overflow-x-auto transition-opacity', lista.cargando.value && 'opacity-60')">
      <table class="w-full min-w-[760px] text-left text-[13.5px]">
        <thead class="border-b border-borde bg-superficie-2 text-[12px] text-tenue">
          <tr>
            <th scope="col" class="px-4 py-2.5 font-medium">Registro</th>
            <th scope="col" class="px-4 py-2.5 font-medium">Paciente</th>
            <th scope="col" class="px-4 py-2.5 font-medium">Prestación</th>
            <th scope="col" class="px-4 py-2.5 text-right font-medium">Monto</th>
            <th scope="col" class="px-4 py-2.5 font-medium">Origen</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-borde">
          <tr
            v-for="f in lista.datos.value.items"
            :key="f.id"
            tabindex="0"
            class="cursor-pointer transition-colors hover:bg-superficie-2/60 focus-visible:bg-superficie-2 focus-visible:outline-none"
            :aria-label="`Ver detalle de la fila ${f.numero} de ${f.archivo}`"
            @click="detalle = f"
            @keydown.enter="detalle = f"
          >
            <td class="num px-4 py-3 whitespace-nowrap">
              <template v-if="f.fechaRegistro">{{ formatearFecha(f.fechaRegistro) }}</template>
              <span v-else class="text-tenue">Sin fecha</span>
            </td>
            <td class="px-4 py-3">
              <p class="font-medium">
                <template v-if="nombre(f)">{{ nombre(f) }}</template>
                <span v-else class="text-tenue">Sin nombre</span>
              </p>
              <p class="num text-[12px] text-tenue">
                {{ f.doc ? mostrarValor("documento", { o: f.doc, n: f.doc }) : "Sin documento" }}
              </p>
            </td>
            <td class="max-w-56 truncate px-4 py-3 text-suave">{{ f.campos.concepto?.o || "—" }}</td>
            <td class="num px-4 py-3 text-right">{{ f.monto !== null ? formatearCLP(f.monto) : "—" }}</td>
            <td class="px-4 py-3">
              <p class="max-w-48 truncate text-[12.5px]">{{ f.archivo }}</p>
              <p class="text-[12px] text-tenue">
                Fila {{ f.numero }} · {{ f.tipoPlanilla === "pagos" ? "Pagos" : "Pacientes" }}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Tarjeta>
  <Paginacion
    v-if="lista.datos.value"
    v-model="pagina"
    class="mt-4"
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
  </Dialogo>
</template>

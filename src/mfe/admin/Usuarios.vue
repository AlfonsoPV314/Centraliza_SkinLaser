<script setup lang="ts">
import { computed, ref, shallowRef } from "vue"
import { useRoute, useRouter } from "vue-router"
import { Activity, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2, UserRound, Users } from "@lucide/vue"
import { mensajeError, useInformarError, useNotificar, useServicios, useUsuario } from "@/application"
import type { Usuario } from "@/contracts"
import { formatearTelefono } from "@/domain/contact"
import { useCarga, useRetardo } from "@/shared/hooks"
import { tiempoRelativo } from "@/shared/presentacion"
import { Boton, Dialogo, EncabezadoPagina, Entrada, Esqueleto, Insignia, Paginacion, Pestanas, Tarjeta, Vacio, cn } from "@/shared/ui"
import Actividad from "./Actividad.vue"
import FormularioUsuario from "./FormularioUsuario.vue"

const POR_PAGINA = 10
const s = useServicios()
const { token, usuario: yo } = useUsuario()
const informar = useInformarError()
const notificar = useNotificar()
const route = useRoute()
const router = useRouter()

const pestana = computed({
  get: () => (route.query.pestana === "actividad" ? "actividad" : "usuarios"),
  set: (p) => router.replace({ query: p === "usuarios" ? {} : { pestana: p } }),
})

const q = ref("")
const pagina = ref(1)
const busqueda = useRetardo(q)
const lista = useCarga(
  () => s.usuarios.listar(token.value, busqueda.value, { pagina: pagina.value, porPagina: POR_PAGINA }),
  [busqueda, pagina],
)
const editando = shallowRef<Usuario | "nuevo" | null>(null)
const eliminando = shallowRef<Usuario | null>(null)
const ocupado = ref(false)

const iniciales = (n: string) =>
  n
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()

async function alternarActivo(u: Usuario) {
  try {
    await s.usuarios.actualizar(token.value, u.id, { activo: !u.activo })
    notificar({ tono: "exito", titulo: u.activo ? `Se desactivó a ${u.nombreUsuario}` : `Se activó a ${u.nombreUsuario}` })
    lista.recargar(true)
  } catch (e) {
    informar(e)
  }
}

async function eliminar() {
  if (!eliminando.value) return
  ocupado.value = true
  try {
    await s.usuarios.eliminar(token.value, eliminando.value.id)
    notificar({ tono: "exito", titulo: "Usuario eliminado" })
    eliminando.value = null
    lista.recargar(true)
  } catch (e) {
    informar(e, "No se pudo eliminar")
  } finally {
    ocupado.value = false
  }
}

function guardado() {
  editando.value = null
  lista.recargar(true)
}
</script>

<template>
  <div class="animar-aparecer">
    <EncabezadoPagina
      titulo="Usuarios y roles"
      descripcion="Solo los administradores crean cuentas. No existe registro abierto."
    >
      <template #acciones>
        <Boton v-if="pestana === 'usuarios'" variante="primario" :icono="Plus" @click="editando = 'nuevo'">Nuevo usuario</Boton>
      </template>
    </EncabezadoPagina>

    <Pestanas
      v-model="pestana"
      class="mb-4"
      :pestanas="[
        { valor: 'usuarios', etiqueta: 'Cuentas', icono: Users },
        { valor: 'actividad', etiqueta: 'Actividad', icono: Activity },
      ]"
    />

    <Actividad v-if="pestana === 'actividad'" />
    <template v-else>
      <div class="mb-4 max-w-sm">
        <Entrada
          v-model="q"
          :prefijo="Search"
          placeholder="Buscar por nombre o correo"
          aria-label="Buscar usuarios"
          @update:model-value="pagina = 1"
        />
      </div>
      <Tarjeta :relleno="false" class="overflow-hidden">
        <div v-if="lista.cargando.value && !lista.datos.value" class="space-y-2 p-4">
          <Esqueleto v-for="i in 4" :key="i" class="h-12" />
        </div>
        <Vacio v-else-if="lista.error.value" titulo="No pudimos cargar los usuarios">
          {{ mensajeError(lista.error.value) }}
          <template #accion><Boton :icono="RefreshCw" @click="lista.recargar()">Reintentar</Boton></template>
        </Vacio>
        <Vacio
          v-else-if="!lista.datos.value?.items.length"
          :icono="Users"
          :titulo="q ? 'Nadie coincide con la búsqueda' : 'Aún no hay usuarios'"
        />
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[720px] text-left text-[13.5px]">
            <thead class="border-b border-borde bg-superficie-2 text-[12px] text-tenue">
              <tr>
                <th class="px-4 py-2.5 font-medium">Nombre</th>
                <th class="px-4 py-2.5 font-medium">Contacto</th>
                <th class="px-4 py-2.5 font-medium">Rol</th>
                <th class="px-4 py-2.5 font-medium">Estado</th>
                <th class="px-4 py-2.5 font-medium"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-borde">
              <tr
                v-for="u in lista.datos.value.items"
                :key="u.id"
                :class="cn('transition-colors hover:bg-superficie-2/60', !u.activo && 'text-tenue')"
              >
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-superficie-3 text-[12px] font-semibold">
                      {{ iniciales(u.nombreUsuario) }}
                    </span>
                    <div class="min-w-0">
                      <p class="font-medium text-texto">
                        {{ u.nombreUsuario }}
                        <span v-if="u.id === yo.id" class="text-[12px] font-normal text-tenue">(usted)</span>
                      </p>
                      <p class="text-[12px] text-tenue">Creado {{ tiempoRelativo(u.creadoEn) }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <p>{{ u.correo }}</p>
                  <p class="num text-[12px] text-tenue">{{ formatearTelefono(u.telefono) }}</p>
                </td>
                <td class="px-4 py-3">
                  <Insignia v-if="u.rol === 'administrador'" tono="acento" :icono="ShieldCheck">Administrador</Insignia>
                  <Insignia v-else :icono="UserRound">Usuario</Insignia>
                </td>
                <td class="px-4 py-3">
                  <button
                    type="button"
                    :disabled="u.id === yo.id"
                    class="disabled:cursor-not-allowed"
                    :title="u.id === yo.id ? 'No puede desactivar su propia cuenta' : u.activo ? 'Desactivar' : 'Activar'"
                    @click="alternarActivo(u)"
                  >
                    <Insignia :tono="u.activo ? 'exito' : 'neutro'">{{ u.activo ? "Activo" : "Desactivado" }}</Insignia>
                  </button>
                  <p v-if="!u.correoVerificado" class="mt-1 text-[11.5px] text-aviso">Correo sin verificar</p>
                </td>
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-1">
                    <Boton
                      tamano="sm"
                      variante="fantasma"
                      solo-icono
                      :aria-label="`Editar a ${u.nombreUsuario}`"
                      :icono="Pencil"
                      @click="editando = u"
                    />
                    <Boton
                      tamano="sm"
                      variante="fantasma"
                      solo-icono
                      :aria-label="`Eliminar a ${u.nombreUsuario}`"
                      :icono="Trash2"
                      :disabled="u.id === yo.id"
                      @click="eliminando = u"
                    />
                  </div>
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
        :por-pagina="POR_PAGINA"
      />
    </template>

    <FormularioUsuario
      v-if="editando"
      :usuario="editando === 'nuevo' ? null : editando"
      :es-yo="editando !== 'nuevo' && editando.id === yo.id"
      @cerrar="editando = null"
      @guardado="guardado"
    />

    <Dialogo
      :abierto="!!eliminando"
      ancho="sm"
      :titulo="`¿Eliminar a ${eliminando?.nombreUsuario}?`"
      descripcion="Perderá el acceso de inmediato. Los datos que cargó se conservan. Si solo quiere quitarle el acceso por un tiempo, desactívelo."
      @cerrar="!ocupado && (eliminando = null)"
    >
      <template #pie>
        <Boton :disabled="ocupado" @click="eliminando = null">Cancelar</Boton>
        <Boton variante="peligro" :cargando="ocupado" @click="eliminar">Eliminar</Boton>
      </template>
    </Dialogo>
  </div>
</template>

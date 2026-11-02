<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue"
import { useRoute } from "vue-router"
import { FlaskConical, Menu, X } from "@lucide/vue"
import type { EstadoDatos, Importacion } from "@/contracts"
import { useCambiosDatos, useServicios, useSesion } from "@/application"
import { MARCA } from "@/config/brand"
import { Insignia } from "@/shared/ui"
import AvisoInactividad from "./AvisoInactividad.vue"
import BuzonSimulado from "./BuzonSimulado.vue"
import LogoCliente from "./LogoCliente.vue"
import Marca from "./Marca.vue"
import MenuUsuario from "./MenuUsuario.vue"
import Navegacion from "./Navegacion.vue"
import Notificaciones from "./Notificaciones.vue"
import SoloAdmin from "./SoloAdmin.vue"
import { NAVEGACION } from "./router"

const s = useServicios()
const sesion = useSesion()
const route = useRoute()
const menuMovil = ref(false)
const estado = shallowRef<EstadoDatos | null>(null)
const importaciones = shallowRef<Importacion[]>([])

function refrescar() {
  const token = sesion.token.value
  if (!token) return
  s.datos.estado(token).then((e) => (estado.value = e)).catch(() => {})
  s.ingesta.listar(token, 5).then((l) => (importaciones.value = l)).catch(() => {})
}
refrescar()
useCambiosDatos(refrescar)

watch(
  () => route.path,
  () => {
    menuMovil.value = false
    window.scrollTo?.({ top: 0 })
  },
)

const entradas = computed(() =>
  NAVEGACION.filter((e) => !e.soloAdmin || sesion.esAdmin.value).sort((a, b) => a.orden - b.orden),
)
const pendientes = computed(() => (estado.value?.filasConError ?? 0) + (estado.value?.duplicadosPendientes ?? 0))
const bloqueada = computed(() => route.meta.soloAdmin && !sesion.esAdmin.value)
</script>

<template>
  <div class="min-h-screen lg:pl-60">
    <a
      href="#contenido"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-acento focus:px-3 focus:py-2 focus:text-sobre-acento"
    >
      Saltar al contenido
    </a>
    <template v-for="movil in [false, true]" :key="String(movil)">
      <div v-if="movil ? menuMovil : true" :class="movil ? 'fixed inset-0 z-40 lg:hidden' : 'contents'">
        <div v-if="movil" class="absolute inset-0 bg-black/45" aria-hidden="true" @click="menuMovil = false" />
        <aside
          :class="
            movil
              ? 'animar-deslizar absolute inset-y-0 left-0 w-72 border-r border-borde bg-superficie'
              : 'fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-borde bg-superficie lg:block'
          "
        >
          <button
            v-if="movil"
            type="button"
            class="absolute top-4 right-3 flex size-8 items-center justify-center rounded-md text-tenue hover:bg-superficie-2"
            aria-label="Cerrar menú"
            @click="menuMovil = false"
          >
            <X class="size-4" />
          </button>
          <div class="flex h-full flex-col">
            <div class="flex h-14 items-center px-4">
              <RouterLink to="/" aria-label="Ir al inicio"><Marca /></RouterLink>
            </div>
            <div class="flex-1 overflow-y-auto px-3 py-2">
              <Navegacion
                :entradas="entradas.filter((e) => !e.soloAdmin)"
                :pendientes="pendientes"
                @navegar="menuMovil = false"
              />
              <template v-if="entradas.some((e) => e.soloAdmin)">
                <p class="px-3 pt-6 pb-2 text-[11px] font-semibold tracking-wider text-tenue uppercase">Administración</p>
                <Navegacion :entradas="entradas.filter((e) => e.soloAdmin)" :pendientes="0" @navegar="menuMovil = false" />
              </template>
            </div>
            <div class="flex items-center gap-2.5 border-t border-borde px-5 py-3">
              <LogoCliente class="size-7" />
              <p class="text-[11px] leading-tight text-tenue">
                {{ MARCA.cliente }}<span class="block">{{ MARCA.descripcionCliente }}</span>
              </p>
            </div>
          </div>
        </aside>
      </div>
    </template>
    <header
      class="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-borde bg-fondo/85 px-4 backdrop-blur-md sm:px-6"
    >
      <button
        type="button"
        class="flex size-9 items-center justify-center rounded-lg text-suave hover:bg-superficie-2 lg:hidden"
        aria-label="Abrir menú"
        @click="menuMovil = true"
      >
        <Menu class="size-5" />
      </button>
      <RouterLink to="/" class="lg:hidden"><Marca compacta /></RouterLink>
      <div class="ml-auto flex items-center gap-1">
        <Insignia tono="aviso" class="mr-2 hidden md:inline-flex" :icono="FlaskConical">Prototipo</Insignia>
        <BuzonSimulado variante="barra" />
        <Notificaciones :estado="estado" :importaciones="importaciones" />
        <div class="mx-1 h-6 w-px bg-borde" />
        <MenuUsuario />
      </div>
    </header>
    <main id="contenido" class="mx-auto w-full max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <SoloAdmin v-if="bloqueada" />
      <slot v-else />
    </main>
    <AvisoInactividad />
  </div>
</template>

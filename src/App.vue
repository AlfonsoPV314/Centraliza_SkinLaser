<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { fijarServicios, mensajeError, restaurarSesion, useSesion } from "@/application"
import { obtenerServicios } from "@/infrastructure/servicios"
import { Toasts } from "@/shared/ui"
import LayoutPrivado from "@/shell/LayoutPrivado.vue"
import LayoutPublico from "@/shell/LayoutPublico.vue"
import PantallaCarga from "@/shell/PantallaCarga.vue"
import PantallaError from "@/shell/PantallaError.vue"
import ErrorPantalla from "@/shell/ErrorPantalla.vue"
import { esDisenoPublico } from "@/shell/router"
import { onErrorCaptured } from "vue"

const listo = ref(false)
const error = ref<string | null>(null)
const fallaPantalla = ref(false)
const route = useRoute()
const router = useRouter()
const sesion = useSesion()

async function iniciar() {
  error.value = null
  try {
    fijarServicios(await obtenerServicios())
    await restaurarSesion()
    listo.value = true
  } catch (e) {
    error.value = mensajeError(e, "No se pudo iniciar el sistema.")
  }
}
iniciar()

// Al cerrar o abrir sesión, se lleva al usuario a la pantalla que corresponde.
watch(sesion.usuario, (u, antes) => {
  const acceso = route.meta.acceso
  if (!u && antes && (acceso === "privada" || acceso === "protegida")) router.replace("/ingresar")
  if (u && !antes && acceso === "publica") {
    const volver = route.query.volver
    router.replace(typeof volver === "string" && volver.startsWith("/") ? volver : "/")
  }
})
watch(() => route.fullPath, () => (fallaPantalla.value = false))
onErrorCaptured((e) => {
  console.error(e)
  fallaPantalla.value = true
  return false
})

const publico = computed(() => esDisenoPublico(route.meta.acceso))
</script>

<template>
  <PantallaError v-if="error" :mensaje="error" @reintentar="iniciar" />
  <PantallaCarga v-else-if="!listo || !route.matched.length" />
  <component :is="publico ? LayoutPublico : LayoutPrivado" v-else>
    <ErrorPantalla v-if="fallaPantalla" />
    <RouterView v-else v-slot="{ Component }">
      <Suspense>
        <component :is="Component" :key="route.path" />
        <template #fallback><PantallaCarga texto="Cargando…" /></template>
      </Suspense>
    </RouterView>
  </component>
  <Toasts />
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import { Copy, Database, FileWarning, History, UserRoundPen } from "@lucide/vue"
import { useCambiosDatos, useServicios, useUsuario } from "@/application"
import { useCarga } from "@/shared/hooks"
import { EncabezadoPagina, Pestanas } from "@/shared/ui"
import Duplicados from "./Duplicados.vue"
import Errores from "./Errores.vue"
import Historial from "./Historial.vue"
import Incompletos from "./Incompletos.vue"
import Registros from "./Registros.vue"

type Pestana = "registros" | "errores" | "duplicados" | "incompletos" | "historial"
const PESTANAS: Pestana[] = ["registros", "errores", "duplicados", "incompletos", "historial"]

const s = useServicios()
const { token } = useUsuario()
const route = useRoute()
const router = useRouter()
const pestana = computed<Pestana>({
  get: () => {
    const q = route.query.pestana as Pestana
    return PESTANAS.includes(q) ? q : "registros"
  },
  set: (p) => void router.replace({ query: p === "registros" ? {} : { pestana: p } }),
})
const estado = useCarga(() => s.datos.estado(token.value), [token])
const catalogo = useCarga(() => s.datos.columnas(token.value), [token])
useCambiosDatos(() => {
  estado.recargar(true)
  catalogo.recargar(true)
})

const pestanas = computed(() => {
  const e = estado.datos.value
  return [
    { valor: "registros" as const, etiqueta: "Registros", icono: Database, contador: e?.filas },
    { valor: "errores" as const, etiqueta: "Con errores", icono: FileWarning, contador: e?.filasConError },
    { valor: "duplicados" as const, etiqueta: "Duplicados", icono: Copy, contador: e?.duplicadosPendientes },
    {
      valor: "incompletos" as const,
      etiqueta: "Pacientes incompletos",
      icono: UserRoundPen,
      contador: e?.pacientesIncompletos,
    },
    { valor: "historial" as const, etiqueta: "Historial", icono: History },
  ]
})
</script>

<template>
  <div class="animar-aparecer">
    <EncabezadoPagina
      titulo="Datos"
      descripcion="Lo que está guardado, lo que falta revisar y el historial de cargas."
    />
    <Pestanas v-model="pestana" class="mb-5" :pestanas="pestanas" />
    <Registros v-if="pestana === 'registros'" :catalogo="catalogo.datos.value" />
    <Errores v-else-if="pestana === 'errores'" :catalogo="catalogo.datos.value" />
    <Duplicados v-else-if="pestana === 'duplicados'" :catalogo="catalogo.datos.value" />
    <Incompletos v-else-if="pestana === 'incompletos'" :catalogo="catalogo.datos.value" />
    <Historial v-else />
  </div>
</template>

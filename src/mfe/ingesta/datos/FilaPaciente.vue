<script setup lang="ts">
import { ref } from "vue"
import { avisarCambioDatos, campoError, mensajeError, useServicios, useUsuario, useNotificar } from "@/application"
import type { ColumnaCatalogo, Paciente } from "@/domain/model"
import { Boton, Campo, Entrada, Insignia } from "@/shared/ui"
import { etiquetaDe, mostrarValor, nombreDeFila, tipoDe } from "../valores"

const p = defineProps<{
  paciente: Paciente & { faltantes: string[] }
  catalogo: ColumnaCatalogo[] | null
}>()
const emit = defineEmits<{ guardado: [] }>()
const s = useServicios()
const { token } = useUsuario()
const notificar = useNotificar()
const abierto = ref(false)
const valores = ref<Record<string, string>>({})
const guardando = ref(false)
const error = ref<{ campo: string | null; mensaje: string } | null>(null)
const tieneNombre = !!(p.paciente.campos.nombre_completo?.o || p.paciente.campos.nombres?.o)
const idBase = `pac-${p.paciente.doc}`

async function guardar() {
  if (!Object.values(valores.value).some((v) => v.trim())) {
    error.value = { campo: null, mensaje: "Complete al menos un campo." }
    return
  }
  guardando.value = true
  error.value = null
  try {
    await s.datos.actualizarPaciente(token.value, p.paciente.doc, valores.value)
    notificar({ tono: "exito", titulo: "Paciente actualizado" })
    avisarCambioDatos()
    abierto.value = false
    valores.value = {}
    emit("guardado")
  } catch (e) {
    error.value = { campo: campoError(e), mensaje: mensajeError(e) }
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <div class="px-5 py-3.5">
    <div class="flex flex-wrap items-center gap-3">
      <div class="min-w-0 flex-1">
        <p class="text-[14px] font-medium">
          <template v-if="tieneNombre">{{ nombreDeFila(paciente) }}</template>
          <span v-else class="text-tenue">Sin nombre</span>
        </p>
        <p class="num text-[12.5px] text-tenue">
          {{ mostrarValor("documento", { o: paciente.doc, n: paciente.doc }) }}
        </p>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <Insignia v-for="f in paciente.faltantes" :key="f" tono="aviso">{{ etiquetaDe(f, catalogo) }}</Insignia>
      </div>
      <Boton tamano="sm" :aria-expanded="abierto" @click="abierto = !abierto">
        {{ abierto ? "Cerrar" : "Completar" }}
      </Boton>
    </div>
    <form v-if="abierto" class="animar-aparecer mt-3 rounded-lg bg-superficie-2 p-4" @submit.prevent="guardar">
      <div class="grid gap-3 sm:grid-cols-2">
        <Campo
          v-for="f in paciente.faltantes"
          :key="f"
          :etiqueta="etiquetaDe(f, catalogo)"
          :html-for="`${idBase}-${f}`"
          :error="error?.campo === f ? error.mensaje : null"
          :ayuda="tipoDe(f, catalogo) === 'fecha' ? 'Día-mes-año, por ejemplo 04-03-1985' : undefined"
        >
          <Entrada
            :id="`${idBase}-${f}`"
            v-model="valores[f]"
            :type="f === 'email' ? 'email' : 'text'"
            :invalido="error?.campo === f"
          />
        </Campo>
      </div>
      <p v-if="error && !error.campo" class="mt-2 text-[12.5px] text-peligro" role="alert">{{ error.mensaje }}</p>
      <div class="mt-3 flex justify-end">
        <Boton type="submit" variante="primario" tamano="sm" :cargando="guardando">Guardar</Boton>
      </div>
    </form>
  </div>
</template>

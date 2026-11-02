<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import { useRoute } from "vue-router"
import { CheckCircle2, LinkIcon, ShieldCheck } from "@lucide/vue"
import { campoError, mensajeError, useServicios, useSesion } from "@/application"
import { contrasenaSegura } from "@/domain/password"
import { Aviso, Boton, Campo, CampoContrasena, Cargando, ListaRequisitos, Vacio } from "@/shared/ui"
import EncabezadoAuth from "./EncabezadoAuth.vue"

const s = useServicios()
const sesion = useSesion()
const route = useRoute()
const token = typeof route.query.token === "string" ? route.query.token : ""
const validez = ref<{ estado: "revisando" | "ok" | "invalido"; mensaje?: string }>({ estado: "revisando" })
const v = reactive({ actual: "", nueva: "", confirmar: "" })
const tocado = ref(false)
const enviando = ref(false)
const error = ref<{ campo: string | null; mensaje: string } | null>(null)
const listo = ref(false)

if (!token)
  validez.value = { estado: "invalido", mensaje: "El enlace está incompleto. Solicite uno nuevo desde su perfil." }
else
  s.auth
    .validarToken(token)
    .then(
      (r) =>
        (validez.value =
          r.proposito === "confirmacion"
            ? { estado: "ok" }
            : { estado: "invalido", mensaje: "Este enlace es para recuperar la contraseña, no para cambiarla." }),
    )
    .catch((e) => (validez.value = { estado: "invalido", mensaje: mensajeError(e) }))

const errNueva = computed(() =>
  !contrasenaSegura(v.nueva)
    ? "La contraseña aún no cumple todos los requisitos."
    : v.nueva === v.actual
      ? "La contraseña nueva debe ser distinta de la actual."
      : null,
)
const errActual = computed(() =>
  error.value?.campo === "actual"
    ? error.value.mensaje
    : tocado.value && !v.actual
      ? "Escriba su contraseña actual."
      : null,
)

async function enviar() {
  tocado.value = true
  if (!v.actual || errNueva.value || v.nueva !== v.confirmar) return
  enviando.value = true
  error.value = null
  try {
    await s.auth.cambiarContrasena(sesion.token.value, token, v.actual, v.nueva)
    listo.value = true
  } catch (e) {
    error.value = { campo: campoError(e), mensaje: mensajeError(e) }
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <Cargando v-if="validez.estado === 'revisando'" texto="Revisando el enlace…" />
  <Vacio v-else-if="validez.estado === 'invalido'" :icono="LinkIcon" titulo="Este enlace ya no sirve">
    {{ validez.mensaje }}
    <template #accion>
      <RouterLink to="/perfil"><Boton variante="primario">Ir a mi perfil</Boton></RouterLink>
    </template>
  </Vacio>
  <Vacio v-else-if="listo" :icono="CheckCircle2" titulo="Contraseña cambiada">
    La próxima vez que ingrese, use su nueva contraseña.
    <template #accion>
      <RouterLink to="/perfil"><Boton variante="primario">Volver a mi perfil</Boton></RouterLink>
    </template>
  </Vacio>
  <div v-else class="animar-aparecer">
    <EncabezadoAuth
      titulo="Cambiar contraseña"
      descripcion="Confirme su contraseña actual y elija una nueva."
      :icono="ShieldCheck"
    />
    <form class="space-y-4" novalidate @submit.prevent="enviar">
      <Campo etiqueta="Contraseña actual" html-for="actual" :error="errActual">
        <CampoContrasena
          id="actual"
          v-model="v.actual"
          autocomplete="current-password"
          autofocus
          @update:model-value="error = null"
        />
      </Campo>
      <Campo etiqueta="Contraseña nueva" html-for="nueva" :error="tocado ? errNueva : null">
        <CampoContrasena id="nueva" v-model="v.nueva" autocomplete="new-password" />
      </Campo>
      <ListaRequisitos :contrasena="v.nueva" />
      <Campo
        etiqueta="Repita la contraseña nueva"
        html-for="confirmar"
        :error="tocado && v.nueva !== v.confirmar ? 'Las contraseñas no coinciden.' : null"
      >
        <CampoContrasena id="confirmar" v-model="v.confirmar" autocomplete="new-password" />
      </Campo>
      <Aviso v-if="error && error.campo !== 'actual'" tono="peligro">{{ error.mensaje }}</Aviso>
      <div class="flex gap-2">
        <RouterLink to="/perfil" class="flex-1"><Boton class="w-full" tamano="lg">Cancelar</Boton></RouterLink>
        <Boton type="submit" variante="primario" tamano="lg" class="flex-1" :cargando="enviando">Cambiar contraseña</Boton>
      </div>
    </form>
  </div>
</template>

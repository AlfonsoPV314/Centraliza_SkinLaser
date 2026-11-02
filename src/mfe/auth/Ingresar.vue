<script setup lang="ts">
import { computed, ref } from "vue"
import { useRoute } from "vue-router"
import { ArrowRight } from "@lucide/vue"
import { mensajeError, useSesion } from "@/application"
import { correoValido } from "@/domain/contact"
import { Aviso, Boton, Campo, CampoContrasena, Entrada } from "@/shared/ui"
import CuentasDemo from "./CuentasDemo.vue"
import EncabezadoAuth from "./EncabezadoAuth.vue"

const sesion = useSesion()
const route = useRoute()
const correo = ref(typeof route.query.correo === "string" ? route.query.correo : "")
const contrasena = ref("")
const enviando = ref(false)
const error = ref<string | null>(null)
const tocado = ref(false)

const errorCorreo = computed(() =>
  tocado.value && correo.value && !correoValido(correo.value)
    ? "Revise el formato del correo (por ejemplo, nombre@skinlaser.cl)."
    : null,
)

// Al iniciar sesión, App redirige al inicio (o a la ruta pedida en «volver»).
async function enviar() {
  tocado.value = true
  if (!correoValido(correo.value) || !contrasena.value) {
    error.value = "Ingrese su correo y su contraseña."
    return
  }
  enviando.value = true
  error.value = null
  try {
    await sesion.iniciar(correo.value, contrasena.value)
  } catch (e) {
    error.value = mensajeError(e)
    enviando.value = false
  }
}

function elegir(c: { correo: string; contrasena: string }) {
  correo.value = c.correo
  contrasena.value = c.contrasena
  error.value = null
}
</script>

<template>
  <div class="animar-aparecer">
    <EncabezadoAuth titulo="Ingresar" descripcion="Use el correo y la contraseña de su cuenta en el sistema." />
    <Aviso v-if="sesion.estado.motivoCierre === 'inactividad'" tono="info" titulo="Cerramos su sesión por inactividad" class="mb-5">
      Pasaron 15 minutos sin actividad. Vuelva a ingresar para continuar.
    </Aviso>
    <Aviso v-else-if="sesion.estado.motivoCierre === 'expirada'" tono="info" titulo="Su sesión expiró" class="mb-5">
      Por seguridad, vuelva a ingresar.
    </Aviso>
    <Aviso v-if="route.query.restablecida" tono="exito" titulo="Contraseña actualizada" class="mb-5">
      Ingrese con su nueva contraseña.
    </Aviso>
    <form class="space-y-4" novalidate @submit.prevent="enviar">
      <Campo etiqueta="Correo electrónico" html-for="correo" :error="errorCorreo">
        <Entrada
          id="correo"
          v-model="correo"
          type="email"
          autocomplete="username"
          :invalido="!!errorCorreo"
          placeholder="nombre@skinlaser.cl"
          autofocus
          tamano="lg"
          @blur="tocado = true"
        />
      </Campo>
      <Campo etiqueta="Contraseña" html-for="contrasena">
        <template #accion>
          <RouterLink to="/recuperar" class="text-[13px] text-acento hover:underline">¿Olvidó su contraseña?</RouterLink>
        </template>
        <CampoContrasena id="contrasena" v-model="contrasena" autocomplete="current-password" tamano="lg" />
      </Campo>
      <Aviso v-if="error" tono="peligro">{{ error }}</Aviso>
      <Boton
        type="submit"
        variante="primario"
        tamano="lg"
        class="w-full"
        :cargando="enviando"
        :icono-derecha="enviando ? undefined : ArrowRight"
      >
        Ingresar
      </Boton>
    </form>
    <div class="mt-6 flex flex-col gap-2 text-center text-[13.5px] text-suave">
      <p>
        ¿No recuerda su correo?
        <RouterLink to="/recuperar?modo=correo" class="text-acento hover:underline">Recupérelo con su teléfono</RouterLink>
      </p>
      <p class="text-tenue">Las cuentas nuevas las crea un administrador del sistema.</p>
    </div>
    <CuentasDemo @elegir="elegir" />
  </div>
</template>

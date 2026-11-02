<script setup lang="ts">
import { computed, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { ArrowLeft, Inbox, MailQuestion } from "@lucide/vue"
import { mensajeError, useServicios } from "@/application"
import type { CanalMensaje } from "@/contracts"
import { CARACTERISTICAS } from "@/config/features"
import { celularValido, correoValido } from "@/domain/contact"
import { Aviso, Boton, Campo, Entrada, Segmentado } from "@/shared/ui"
import EncabezadoAuth from "./EncabezadoAuth.vue"

type Modo = "contrasena" | "correo"
const s = useServicios()
const route = useRoute()
const router = useRouter()
const modo = computed<Modo>({
  get: () =>
    route.query.modo === "correo" && CARACTERISTICAS.recuperarCorreoPorTelefono ? "correo" : "contrasena",
  set: (m) => {
    router.replace({ query: m === "correo" ? { modo: "correo" } : {} })
    enviado.value = false
    error.value = null
  },
})
const canales = (["sms", "whatsapp"] as const).filter((c) => CARACTERISTICAS.notificaciones[c])
const correo = ref("")
const telefono = ref("")
const canal = ref<CanalMensaje>(canales[0] ?? "sms")
const enviando = ref(false)
const enviado = ref(false)
const error = ref<string | null>(null)

async function enviar() {
  error.value = null
  if (modo.value === "contrasena" && !correoValido(correo.value))
    return void (error.value = "Escriba el correo con el que ingresa al sistema.")
  if (modo.value === "correo" && !celularValido(telefono.value))
    return void (error.value = "Escriba un celular chileno de 9 dígitos que empiece con 9.")
  enviando.value = true
  try {
    if (modo.value === "contrasena") await s.auth.solicitarRecuperacionContrasena(correo.value)
    else await s.auth.recuperarCorreo(telefono.value, canal.value)
    enviado.value = true
  } catch (e) {
    error.value = mensajeError(e)
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <div class="animar-aparecer">
    <RouterLink to="/ingresar" class="mb-6 inline-flex items-center gap-1.5 text-[13px] text-suave hover:text-texto">
      <ArrowLeft class="size-4" /> Volver a ingresar
    </RouterLink>
    <EncabezadoAuth
      titulo="Recuperar acceso"
      descripcion="Por seguridad, no confirmamos si un correo o teléfono está registrado."
      :icono="MailQuestion"
    />
    <Segmentado
      v-if="CARACTERISTICAS.recuperarCorreoPorTelefono"
      v-model="modo"
      class="mb-6 w-full [&>button]:flex-1"
      etiqueta="Qué recuperar"
      :opciones="[
        { valor: 'contrasena', etiqueta: 'Olvidé mi contraseña' },
        { valor: 'correo', etiqueta: 'Olvidé mi correo' },
      ]"
    />
    <div v-if="enviado" class="space-y-4">
      <Aviso
        tono="exito"
        :titulo="modo === 'contrasena' ? 'Revise su correo' : `Revise su ${canal === 'sms' ? 'SMS' : 'WhatsApp'}`"
      >
        {{
          modo === "contrasena"
            ? `Si ${correo.trim()} está registrado, le enviamos un enlace para crear una nueva contraseña. Vence en 30 minutos.`
            : "Si el número está asociado a una cuenta, le enviamos el correo con el que ingresa."
        }}
      </Aviso>
      <p class="flex items-start gap-2 text-[13px] text-suave">
        <Inbox class="mt-0.5 size-4 shrink-0 text-acento" />
        En este prototipo, los mensajes llegan al «Buzón de prueba» (abajo a la izquierda).
      </p>
      <Boton class="w-full" @click="enviado = false">Enviar de nuevo</Boton>
    </div>
    <form v-else class="space-y-4" novalidate @submit.prevent="enviar">
      <Campo
        v-if="modo === 'contrasena'"
        etiqueta="Correo electrónico"
        html-for="correo"
        ayuda="Le enviaremos un enlace para crear una contraseña nueva."
      >
        <Entrada id="correo" v-model="correo" type="email" autocomplete="email" autofocus tamano="lg" />
      </Campo>
      <template v-else>
        <Campo etiqueta="Teléfono celular registrado" html-for="telefono">
          <Entrada
            id="telefono"
            v-model="telefono"
            type="tel"
            inputmode="tel"
            placeholder="+56 9 1234 5678"
            autofocus
            tamano="lg"
          />
        </Campo>
        <Campo v-if="canales.length > 1" etiqueta="¿Cómo prefiere recibirlo?">
          <Segmentado
            v-model="canal"
            etiqueta="Canal"
            :opciones="canales.map((c) => ({ valor: c, etiqueta: c === 'sms' ? 'SMS' : 'WhatsApp' }))"
          />
        </Campo>
      </template>
      <Aviso v-if="error" tono="peligro">{{ error }}</Aviso>
      <Boton type="submit" variante="primario" tamano="lg" class="w-full" :cargando="enviando">
        {{ modo === "contrasena" ? "Enviar enlace" : "Enviar mi correo" }}
      </Boton>
    </form>
  </div>
</template>

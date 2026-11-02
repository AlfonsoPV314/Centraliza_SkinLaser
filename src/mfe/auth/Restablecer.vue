<script setup lang="ts">
import { ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { KeyRound, LinkIcon } from "@lucide/vue"
import { mensajeError, useServicios, useSesion } from "@/application"
import { contrasenaSegura } from "@/domain/password"
import { Aviso, Boton, Campo, CampoContrasena, Cargando, ListaRequisitos, Vacio } from "@/shared/ui"
import EncabezadoAuth from "./EncabezadoAuth.vue"

const s = useServicios()
const sesion = useSesion()
const route = useRoute()
const router = useRouter()
const token = typeof route.query.token === "string" ? route.query.token : ""
const validez = ref<{ estado: "revisando" | "ok" | "invalido"; mensaje?: string }>({ estado: "revisando" })
const nueva = ref("")
const confirmar = ref("")
const tocado = ref(false)
const enviando = ref(false)
const error = ref<string | null>(null)

if (!token)
  validez.value = {
    estado: "invalido",
    mensaje: "El enlace está incompleto. Ábralo de nuevo desde el correo o solicite uno nuevo.",
  }
else
  s.auth
    .validarToken(token)
    .then((r) => {
      if (r.proposito === "recuperacion") validez.value = { estado: "ok" }
      else router.replace(`/cambiar-contrasena?token=${encodeURIComponent(token)}`)
    })
    .catch((e) => (validez.value = { estado: "invalido", mensaje: mensajeError(e) }))

async function enviar() {
  tocado.value = true
  if (!contrasenaSegura(nueva.value) || nueva.value !== confirmar.value) return
  enviando.value = true
  error.value = null
  try {
    await s.auth.restablecerContrasena(token, nueva.value)
    // El servidor cierra todas las sesiones de la cuenta; si había una abierta aquí, se cierra también.
    if (sesion.usuario.value) await sesion.cerrar("manual")
    router.replace("/ingresar?restablecida=1")
  } catch (e) {
    error.value = mensajeError(e)
    enviando.value = false
  }
}
</script>

<template>
  <Cargando v-if="validez.estado === 'revisando'" texto="Revisando el enlace…" />
  <Vacio v-else-if="validez.estado === 'invalido'" :icono="LinkIcon" titulo="Este enlace ya no sirve">
    {{ validez.mensaje }}
    <template #accion>
      <RouterLink to="/recuperar"><Boton variante="primario">Solicitar un enlace nuevo</Boton></RouterLink>
    </template>
  </Vacio>
  <div v-else class="animar-aparecer">
    <EncabezadoAuth
      titulo="Cree una contraseña nueva"
      descripcion="Al guardarla, se cerrarán las sesiones abiertas en otros equipos."
      :icono="KeyRound"
    />
    <form class="space-y-4" novalidate @submit.prevent="enviar">
      <Campo
        etiqueta="Contraseña nueva"
        html-for="nueva"
        :error="tocado && !contrasenaSegura(nueva) ? 'La contraseña aún no cumple todos los requisitos.' : null"
      >
        <CampoContrasena id="nueva" v-model="nueva" autocomplete="new-password" autofocus />
      </Campo>
      <ListaRequisitos :contrasena="nueva" />
      <Campo
        etiqueta="Repita la contraseña"
        html-for="confirmar"
        :error="tocado && nueva !== confirmar ? 'Las contraseñas no coinciden.' : null"
      >
        <CampoContrasena id="confirmar" v-model="confirmar" autocomplete="new-password" />
      </Campo>
      <Aviso v-if="error" tono="peligro">{{ error }}</Aviso>
      <Boton type="submit" variante="primario" tamano="lg" class="w-full" :cargando="enviando">Guardar contraseña</Boton>
    </form>
  </div>
</template>

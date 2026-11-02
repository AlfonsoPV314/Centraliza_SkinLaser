<script setup lang="ts">
import { computed, ref } from "vue"
import { mensajeError, useNotificar, useServicios, useSesion, useUsuario } from "@/application"
import type { CanalMensaje, SolicitudVerificacion } from "@/contracts"
import { CARACTERISTICAS } from "@/config/features"
import { celularValido, correoValido, formatearTelefono, normalizarTelefono } from "@/domain/contact"
import { useCuentaRegresiva } from "@/shared/hooks"
import { Boton, Campo, Dialogo, Entrada, Segmentado } from "@/shared/ui"

const props = defineProps<{ tipo: "correo" | "telefono" | null }>()
const emit = defineEmits<{ cerrar: [] }>()

const s = useServicios()
const { token, usuario } = useUsuario()
const { actualizarUsuario } = useSesion()
const notificar = useNotificar()
const canales = (["sms", "whatsapp"] as const).filter((c) => CARACTERISTICAS.notificaciones[c])
const valor = ref("")
const canal = ref<CanalMensaje>(canales[0] ?? "sms")
const solicitud = ref<SolicitudVerificacion | null>(null)
const codigo = ref("")
const ocupado = ref(false)
const error = ref<string | null>(null)
const espera = useCuentaRegresiva(() => solicitud.value?.reenviarDesde)

function cerrar() {
  valor.value = ""
  solicitud.value = null
  codigo.value = ""
  error.value = null
  emit("cerrar")
}

async function pedir() {
  error.value = null
  if (props.tipo === "correo" && !correoValido(valor.value))
    return (error.value = "Escriba un correo válido, por ejemplo nombre@skinlaser.cl.")
  if (props.tipo === "telefono" && !celularValido(valor.value))
    return (error.value = "Escriba un celular chileno de 9 dígitos que empiece con 9.")
  ocupado.value = true
  try {
    solicitud.value =
      props.tipo === "correo"
        ? await s.usuarios.solicitarCambioCorreo(token.value, valor.value, canal.value)
        : await s.usuarios.solicitarCambioTelefono(token.value, normalizarTelefono(valor.value)!)
  } catch (e) {
    error.value = mensajeError(e)
  } finally {
    ocupado.value = false
  }
}

async function confirmar() {
  if (!solicitud.value) return
  if (!/^\d{6}$/.test(codigo.value.trim())) return (error.value = "El código tiene 6 dígitos.")
  ocupado.value = true
  error.value = null
  try {
    actualizarUsuario(await s.usuarios.confirmarCodigo(token.value, solicitud.value.solicitudId, codigo.value.trim()))
    notificar({
      tono: "exito",
      titulo: props.tipo === "correo" ? "Correo actualizado" : "Teléfono actualizado",
      detalle: props.tipo === "correo" ? "Use el nuevo correo la próxima vez que ingrese." : undefined,
    })
    cerrar()
  } catch (e) {
    error.value = mensajeError(e)
  } finally {
    ocupado.value = false
  }
}

async function reenviar() {
  if (!solicitud.value) return
  error.value = null
  try {
    solicitud.value = await s.usuarios.reenviarCodigo(token.value, solicitud.value.solicitudId)
    notificar({ tono: "info", titulo: "Le enviamos un código nuevo" })
  } catch (e) {
    error.value = mensajeError(e)
  }
}

const descripcion = computed(() => {
  const sol = solicitud.value
  if (sol) {
    const destino = sol.canal === "correo" ? "correo" : sol.canal === "whatsapp" ? "WhatsApp" : "SMS"
    return `Escriba el código de 6 dígitos que enviamos por ${destino} a ${sol.destinoEnmascarado}.`
  }
  return props.tipo === "correo"
    ? `Le enviaremos un código a su teléfono ${formatearTelefono(usuario.value.telefono)} para confirmar el cambio.`
    : `Le enviaremos un código a su correo ${usuario.value.correo} para confirmar el cambio.`
})
</script>

<template>
  <Dialogo
    :abierto="!!tipo"
    ancho="sm"
    :titulo="tipo === 'correo' ? 'Cambiar correo electrónico' : 'Cambiar teléfono celular'"
    :descripcion="descripcion"
    @cerrar="!ocupado && cerrar()"
  >
    <form v-if="!solicitud" class="space-y-4" novalidate @submit.prevent="pedir">
      <Campo v-if="tipo === 'correo'" etiqueta="Nuevo correo" html-for="nuevo" :error="error">
        <Entrada id="nuevo" v-model="valor" type="email" autofocus :invalido="!!error" />
      </Campo>
      <Campo v-else etiqueta="Nuevo celular" html-for="nuevo" :error="error">
        <Entrada
          id="nuevo"
          v-model="valor"
          type="tel"
          inputmode="tel"
          placeholder="+56 9 1234 5678"
          autofocus
          :invalido="!!error"
        />
      </Campo>
      <Campo v-if="tipo === 'correo' && canales.length > 1" etiqueta="Recibir el código por">
        <Segmentado
          v-model="canal"
          etiqueta="Canal"
          :opciones="canales.map((c) => ({ valor: c, etiqueta: c === 'sms' ? 'SMS' : 'WhatsApp' }))"
        />
      </Campo>
      <div class="flex justify-end gap-2 pt-1">
        <Boton @click="cerrar">Cancelar</Boton>
        <Boton type="submit" variante="primario" :cargando="ocupado">Enviar código</Boton>
      </div>
    </form>
    <form v-else class="space-y-4" novalidate @submit.prevent="confirmar">
      <Campo etiqueta="Código de verificación" html-for="codigo" :error="error">
        <Entrada
          id="codigo"
          :model-value="codigo"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          autofocus
          :invalido="!!error"
          class="h-12 text-center font-mono text-[20px] tracking-[0.5em]"
          @update:model-value="(v) => (codigo = String(v ?? '').replace(/\D/g, ''))"
        />
      </Campo>
      <p class="text-[12.5px] text-tenue">En este prototipo, el código llega al «Buzón de prueba».</p>
      <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Boton variante="enlace" :disabled="espera > 0" @click="reenviar">
          {{ espera > 0 ? `Reenviar en ${espera} s` : "Reenviar código" }}
        </Boton>
        <div class="flex gap-2">
          <Boton @click="cerrar">Cancelar</Boton>
          <Boton type="submit" variante="primario" :cargando="ocupado">Confirmar</Boton>
        </div>
      </div>
    </form>
  </Dialogo>
</template>

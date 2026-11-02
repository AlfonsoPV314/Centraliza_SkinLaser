<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { KeyRound, Mail, Phone, ShieldCheck, UserRound } from "@lucide/vue"
import { mensajeError, useInformarError, useNotificar, useServicios, useSesion, useUsuario } from "@/application"
import { formatearTelefono } from "@/domain/contact"
import { Aviso, Boton, Campo, EncabezadoPagina, EncabezadoTarjeta, Entrada, Insignia, Tarjeta } from "@/shared/ui"
import DialogoCambio from "./DialogoCambio.vue"
import Preferencias from "./Preferencias.vue"

const s = useServicios()
const { usuario, token } = useUsuario()
const { actualizarUsuario } = useSesion()
const notificar = useNotificar()
const informar = useInformarError()
const dialogo = ref<"correo" | "telefono" | null>(null)

const iniciales = computed(() =>
  usuario.value.nombreUsuario
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase(),
)

// Datos personales
const nombre = ref(usuario.value.nombreUsuario)
watch(() => usuario.value.nombreUsuario, (n) => (nombre.value = n))
const guardando = ref(false)
const errorNombre = ref<string | null>(null)
const cambiado = computed(() => nombre.value.trim() !== usuario.value.nombreUsuario)
async function guardarNombre() {
  if (nombre.value.trim().length < 3) return (errorNombre.value = "Escriba su nombre (al menos 3 letras).")
  guardando.value = true
  errorNombre.value = null
  try {
    actualizarUsuario(await s.usuarios.actualizarPerfil(token.value, { nombreUsuario: nombre.value.trim() }))
    notificar({ tono: "exito", titulo: "Nombre actualizado" })
  } catch (e) {
    errorNombre.value = mensajeError(e)
  } finally {
    guardando.value = false
  }
}

// Contraseña
const enviado = ref<"confirmacion" | "recuperacion" | null>(null)
const ocupado = ref<string | null>(null)
async function pedirEnlace(modo: "confirmacion" | "recuperacion") {
  ocupado.value = modo
  try {
    await s.usuarios.solicitarEnlaceContrasena(token.value, modo)
    enviado.value = modo
  } catch (e) {
    informar(e, "No se pudo enviar el enlace")
  } finally {
    ocupado.value = null
  }
}

const contactos = computed(() => [
  {
    tipo: "correo" as const,
    icono: Mail,
    etiqueta: "Correo electrónico",
    valor: usuario.value.correo,
    detalle: usuario.value.correoVerificado ? "Verificado · se usa para ingresar" : "Sin verificar",
  },
  {
    tipo: "telefono" as const,
    icono: Phone,
    etiqueta: "Teléfono celular",
    valor: formatearTelefono(usuario.value.telefono),
    detalle: "Para recuperar su correo y recibir códigos",
  },
])
</script>

<template>
  <div class="animar-aparecer mx-auto max-w-3xl">
    <EncabezadoPagina titulo="Mi perfil y preferencias" descripcion="Sus datos de acceso y cómo prefiere trabajar con el sistema." />
    <Tarjeta class="mb-6 flex flex-wrap items-center gap-4">
      <span class="flex size-14 items-center justify-center rounded-full bg-acento-tenue text-[18px] font-semibold text-acento">
        {{ iniciales }}
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-[18px] font-semibold tracking-tight">{{ usuario.nombreUsuario }}</p>
        <p class="truncate text-[13.5px] text-suave">{{ usuario.correo }}</p>
      </div>
      <Insignia :tono="usuario.rol === 'administrador' ? 'acento' : 'neutro'" :icono="ShieldCheck">
        {{ usuario.rol === "administrador" ? "Administrador" : "Usuario" }}
      </Insignia>
    </Tarjeta>

    <div class="space-y-6">
      <Tarjeta>
        <EncabezadoTarjeta titulo="Datos personales" :icono="UserRound" />
        <form class="flex flex-wrap items-start gap-3" novalidate @submit.prevent="guardarNombre">
          <Campo etiqueta="Nombre y apellido" html-for="nombre" :error="errorNombre" class="min-w-60 flex-1">
            <Entrada
              id="nombre"
              v-model="nombre"
              autocomplete="name"
              :invalido="!!errorNombre"
              @update:model-value="errorNombre = null"
            />
          </Campo>
          <div class="flex gap-2 sm:pt-[26px]">
            <Boton v-if="cambiado" @click="nombre = usuario.nombreUsuario">Descartar</Boton>
            <Boton type="submit" variante="primario" :disabled="!cambiado" :cargando="guardando">Guardar</Boton>
          </div>
        </form>
      </Tarjeta>

      <Tarjeta>
        <EncabezadoTarjeta
          titulo="Datos de contacto"
          descripcion="Los cambios se confirman con un código enviado al otro medio, para que nadie más pueda hacerlos."
          :icono="Mail"
        />
        <div class="divide-y divide-borde">
          <div v-for="c in contactos" :key="c.tipo" class="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-superficie-2 text-tenue">
              <component :is="c.icono" class="size-4" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-[12.5px] text-tenue">{{ c.etiqueta }}</p>
              <p class="truncate text-[14.5px] font-medium">{{ c.valor }}</p>
              <p class="text-[12px] text-tenue">{{ c.detalle }}</p>
            </div>
            <Boton tamano="sm" @click="dialogo = c.tipo">Cambiar</Boton>
          </div>
        </div>
      </Tarjeta>

      <Tarjeta>
        <EncabezadoTarjeta
          titulo="Contraseña"
          descripcion="Por seguridad, el cambio se hace desde un enlace que enviamos a su correo."
          :icono="KeyRound"
        />
        <Aviso v-if="enviado" tono="exito" titulo="Revise su correo" class="mb-4">
          Enviamos un enlace a {{ usuario.correo }}.
          {{
            enviado === "confirmacion"
              ? "Ahí podrá elegir una contraseña nueva confirmando la actual."
              : "Ahí podrá crear una contraseña nueva sin la actual."
          }}
          En el prototipo, llega al «Buzón de prueba».
        </Aviso>
        <div class="flex flex-wrap gap-2">
          <Boton variante="primario" :cargando="ocupado === 'confirmacion'" @click="pedirEnlace('confirmacion')">
            Cambiar contraseña
          </Boton>
          <Boton variante="fantasma" :cargando="ocupado === 'recuperacion'" @click="pedirEnlace('recuperacion')">
            No recuerdo mi contraseña actual
          </Boton>
        </div>
      </Tarjeta>

      <Preferencias />
    </div>

    <DialogoCambio :tipo="dialogo" @cerrar="dialogo = null" />
  </div>
</template>

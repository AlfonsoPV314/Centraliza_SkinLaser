<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import { campoError, mensajeError, useNotificar, useServicios, useUsuario } from "@/application"
import type { Rol, Usuario } from "@/contracts"
import { celularValido, correoValido, formatearTelefono, normalizarTelefono } from "@/domain/contact"
import { Aviso, Boton, Campo, Dialogo, Entrada, Interruptor, Segmentado } from "@/shared/ui"
import { contrasenaTemporal } from "./contrasenaTemporal"

const props = defineProps<{ usuario: Usuario | null; esYo: boolean }>()
const emit = defineEmits<{ cerrar: []; guardado: [] }>()

const s = useServicios()
const { token } = useUsuario()
const notificar = useNotificar()
const v = reactive({
  nombre: props.usuario?.nombreUsuario ?? "",
  correo: props.usuario?.correo ?? "",
  telefono: props.usuario ? formatearTelefono(props.usuario.telefono) : "",
  rol: (props.usuario?.rol ?? "usuario") as Rol,
  activo: props.usuario?.activo ?? true,
})
const temporal = contrasenaTemporal()
const tocado = ref(false)
const guardando = ref(false)
const errorServidor = ref<{ campo: string | null; mensaje: string } | null>(null)

const errores = computed(() => ({
  nombreUsuario: v.nombre.trim().length < 3 ? "Escriba el nombre (al menos 3 letras)." : null,
  correo: !correoValido(v.correo) ? "Escriba un correo válido." : null,
  telefono: !celularValido(v.telefono) ? "Escriba un celular chileno (+56 9 XXXX XXXX)." : null,
}))
const error = (c: keyof typeof errores.value) =>
  (tocado.value ? errores.value[c] : null) ?? (errorServidor.value?.campo === c ? errorServidor.value.mensaje : null)

async function guardar() {
  tocado.value = true
  if (Object.values(errores.value).some(Boolean)) return
  guardando.value = true
  errorServidor.value = null
  const datos = {
    nombreUsuario: v.nombre.trim(),
    correo: v.correo.trim(),
    telefono: normalizarTelefono(v.telefono)!,
    rol: v.rol,
  }
  try {
    if (props.usuario) {
      await s.usuarios.actualizar(
        token.value,
        props.usuario.id,
        props.esYo
          ? { nombreUsuario: datos.nombreUsuario, correo: datos.correo, telefono: datos.telefono }
          : { ...datos, activo: v.activo },
      )
      notificar({ tono: "exito", titulo: "Cambios guardados" })
    } else {
      await s.usuarios.crear(token.value, { ...datos, contrasenaTemporal: temporal })
      notificar({
        tono: "exito",
        titulo: `Se creó la cuenta de ${datos.nombreUsuario}`,
        detalle: "Le enviamos un correo con su contraseña temporal.",
      })
    }
    emit("guardado")
  } catch (e) {
    errorServidor.value = { campo: campoError(e), mensaje: mensajeError(e) }
    guardando.value = false
  }
}
</script>

<template>
  <Dialogo
    abierto
    :titulo="usuario ? `Editar a ${usuario.nombreUsuario}` : 'Nuevo usuario'"
    :descripcion="usuario ? undefined : 'Le enviaremos un correo con una contraseña temporal para su primer ingreso.'"
    @cerrar="!guardando && emit('cerrar')"
  >
    <form class="space-y-4" novalidate @submit.prevent="guardar">
      <Campo etiqueta="Nombre y apellido" html-for="u-nombre" :error="error('nombreUsuario')">
        <Entrada id="u-nombre" v-model="v.nombre" autofocus :invalido="!!error('nombreUsuario')" />
      </Campo>
      <div class="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Correo" html-for="u-correo" :error="error('correo')">
          <Entrada id="u-correo" v-model="v.correo" type="email" placeholder="nombre@skinlaser.cl" :invalido="!!error('correo')" />
        </Campo>
        <Campo etiqueta="Celular" html-for="u-tel" :error="error('telefono')">
          <Entrada
            id="u-tel"
            v-model="v.telefono"
            type="tel"
            inputmode="tel"
            placeholder="+56 9 1234 5678"
            :invalido="!!error('telefono')"
          />
        </Campo>
      </div>
      <Campo
        etiqueta="Rol"
        :ayuda="
          esYo
            ? 'No puede cambiar su propio rol.'
            : v.rol === 'administrador'
              ? 'Puede gestionar usuarios, además de todo lo demás.'
              : 'Puede cargar datos y generar reportes.'
        "
      >
        <Segmentado
          etiqueta="Rol"
          :model-value="v.rol"
          :opciones="[
            { valor: 'usuario', etiqueta: 'Usuario' },
            { valor: 'administrador', etiqueta: 'Administrador' },
          ]"
          @update:model-value="(rol: Rol) => !esYo && (v.rol = rol)"
        />
      </Campo>
      <Interruptor
        v-if="usuario && !esYo"
        v-model="v.activo"
        etiqueta="Cuenta activa"
        descripcion="Si la desactiva, no podrá ingresar hasta que la vuelva a activar."
      />
      <div v-if="!usuario" class="rounded-lg border border-dashed border-borde-fuerte px-3.5 py-3 text-[13px]">
        <p class="text-tenue">Contraseña temporal</p>
        <p class="font-mono text-[15px] tracking-wide">{{ temporal }}</p>
      </div>
      <Aviso
        v-if="errorServidor && !['nombreUsuario', 'correo', 'telefono'].includes(errorServidor.campo ?? '')"
        tono="peligro"
      >
        {{ errorServidor.mensaje }}
      </Aviso>
      <div class="flex justify-end gap-2 pt-1">
        <Boton :disabled="guardando" @click="emit('cerrar')">Cancelar</Boton>
        <Boton type="submit" variante="primario" :cargando="guardando">
          {{ usuario ? "Guardar cambios" : "Crear usuario" }}
        </Boton>
      </div>
    </form>
  </Dialogo>
</template>

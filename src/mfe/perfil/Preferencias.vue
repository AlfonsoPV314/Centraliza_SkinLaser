<script setup lang="ts">
import { computed } from "vue"
import { FolderDown, Monitor, Moon, Sun } from "@lucide/vue"
import { useInformarError, useNotificar, useSesion, useUsuario } from "@/application"
import type { Preferencias } from "@/contracts"
import { CARACTERISTICAS } from "@/config/features"
import { carpetaDisponible, elegirCarpeta, olvidarCarpeta } from "@/infrastructure/descargas"
import { Boton, EncabezadoTarjeta, Segmentado, Selector, Tarjeta } from "@/shared/ui"
import FilaAjuste from "./FilaAjuste.vue"

const { usuario } = useUsuario()
const { guardarPreferencias } = useSesion()
const informar = useInformarError()
const notificar = useNotificar()
const p = computed(() => usuario.value.preferencias)
const guardar = (c: Partial<Preferencias>) => guardarPreferencias(c).catch((e) => informar(e, "No se guardó la preferencia"))

async function elegir() {
  const nombre = await elegirCarpeta()
  if (nombre) {
    await guardar({ carpetaDescarga: nombre })
    notificar({ tono: "exito", titulo: "Carpeta elegida", detalle: `Los reportes se guardarán en «${nombre}».` })
  }
}
async function quitar() {
  await olvidarCarpeta()
  guardar({ carpetaDescarga: null })
}
const detalleCarpeta = computed(() =>
  carpetaDisponible()
    ? p.value.carpetaDescarga
      ? `Se guardan en «${p.value.carpetaDescarga}».`
      : "Si no elige una, se usan las descargas del navegador."
    : "Este navegador no permite elegir carpeta; se usan las descargas.",
)
</script>

<template>
  <Tarjeta>
    <EncabezadoTarjeta
      titulo="Preferencias"
      descripcion="Se guardan en su cuenta y se aplican en cualquier equipo."
      :icono="Monitor"
    />
    <div class="divide-y divide-borde">
      <FilaAjuste etiqueta="Tema" detalle="Apariencia de la aplicación. El modo claro es el predeterminado.">
        <Segmentado
          etiqueta="Tema"
          :model-value="p.tema"
          :opciones="[
            { valor: 'claro', etiqueta: 'Claro', icono: Sun },
            { valor: 'oscuro', etiqueta: 'Oscuro', icono: Moon },
          ]"
          @update:model-value="(tema) => guardar({ tema })"
        />
      </FilaAjuste>
      <FilaAjuste etiqueta="Filas por página" detalle="En listados de datos y plantillas.">
        <Selector
          :model-value="p.porPagina"
          class="w-28"
          aria-label="Filas por página"
          @update:model-value="(v) => guardar({ porPagina: Number(v) })"
        >
          <option v-for="n in [12, 24, 48, 96]" :key="n" :value="n">{{ n }}</option>
        </Selector>
      </FilaAjuste>
      <FilaAjuste etiqueta="Vista de plantillas" detalle="Cómo se muestran los reportes guardados.">
        <Segmentado
          etiqueta="Vista de plantillas"
          :model-value="p.vistaPlantillas"
          :opciones="[
            { valor: 'tarjetas', etiqueta: 'Tarjetas' },
            { valor: 'filas', etiqueta: 'Lista' },
          ]"
          @update:model-value="(vistaPlantillas) => guardar({ vistaPlantillas })"
        />
      </FilaAjuste>
      <FilaAjuste v-if="CARACTERISTICAS.carpetaDescarga" etiqueta="Carpeta para reportes" :detalle="detalleCarpeta">
        <div class="flex gap-2">
          <Boton v-if="p.carpetaDescarga" variante="fantasma" @click="quitar">Quitar</Boton>
          <Boton :icono="FolderDown" :disabled="!carpetaDisponible()" @click="elegir">
            {{ p.carpetaDescarga ? "Cambiar" : "Elegir carpeta" }}
          </Boton>
        </div>
      </FilaAjuste>
    </div>
  </Tarjeta>
</template>

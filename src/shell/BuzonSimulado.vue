<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue"
import { Copy, ExternalLink, Inbox, Mail, MessageCircle, MessageSquareText, X } from "@lucide/vue"
import { useBuzon, useNotificar } from "@/application"
import { formatearMarcaTiempo } from "@/domain/dates"
import { Boton, Insignia, Vacio, cn } from "@/shared/ui"

withDefaults(defineProps<{ variante?: "flotante" | "barra" }>(), { variante: "flotante" })

const CANAL = {
  correo: { icono: Mail, nombre: "Correo" },
  sms: { icono: MessageSquareText, nombre: "SMS" },
  whatsapp: { icono: MessageCircle, nombre: "WhatsApp" },
} as const

const { mensajes, ultimo, noLeidos, marcarLeidos } = useBuzon()
const abierto = ref(false)
const notificar = useNotificar()
let visto: string | null = null

watch(ultimo, (m) => {
  if (!m || m.id === visto) return
  visto = m.id
  const canal = CANAL[m.canal].nombre
  notificar({
    tono: "info",
    titulo: `Nuevo ${canal === "Correo" ? "correo" : `mensaje por ${canal}`} simulado`,
    detalle: m.asunto,
    accion: { etiqueta: "Ver", alHacer: () => (abierto.value = true) },
  })
})

const tecla = (e: KeyboardEvent) => e.key === "Escape" && cerrar()
watch(abierto, (a) =>
  a ? document.addEventListener("keydown", tecla) : document.removeEventListener("keydown", tecla),
)
onBeforeUnmount(() => document.removeEventListener("keydown", tecla))

function cerrar() {
  abierto.value = false
  if (noLeidos.value) marcarLeidos()
}

/** Abre un enlace del buzón dentro de la aplicación (los enlaces usan rutas con #). */
function abrirEnlace(enlace: string) {
  const i = enlace.indexOf("#")
  if (i >= 0) window.location.hash = enlace.slice(i + 1)
  else window.location.href = enlace
  cerrar()
}

function copiar(codigo: string) {
  navigator.clipboard?.writeText(codigo)
  notificar({ tono: "exito", titulo: "Código copiado", duracion: 2000 })
}
</script>

<template>
  <button
    v-if="variante === 'flotante'"
    type="button"
    class="fixed bottom-4 left-4 z-30 inline-flex h-10 items-center gap-2 rounded-full border border-borde bg-superficie pr-4 pl-3 text-[13px] font-medium shadow-xl hover:border-acento"
    :aria-label="`Buzón de prueba, ${noLeidos} sin leer`"
    @click="abierto = true"
  >
    <Inbox class="size-4 text-acento" />
    Buzón de prueba
    <span v-if="noLeidos > 0" class="num rounded-full bg-acento px-1.5 text-[11px] leading-[18px] text-sobre-acento">
      {{ noLeidos }}
    </span>
  </button>
  <button
    v-else
    type="button"
    class="relative flex size-9 items-center justify-center rounded-lg text-suave hover:bg-superficie-2 hover:text-texto"
    :aria-label="`Buzón de prueba, ${noLeidos} sin leer`"
    title="Buzón de prueba (correos y SMS simulados)"
    @click="abierto = true"
  >
    <Inbox class="size-[18px]" />
    <span
      v-if="noLeidos > 0"
      class="num absolute top-1 right-1 min-w-4 rounded-full bg-acento px-1 text-center text-[10px] leading-4 font-semibold text-sobre-acento"
    >
      {{ noLeidos }}
    </span>
  </button>
  <Teleport to="body">
    <div v-if="abierto" class="fixed inset-0 z-50 flex justify-end">
      <div class="absolute inset-0 bg-black/40" aria-hidden="true" @click="cerrar" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Buzón de prueba"
        class="animar-deslizar relative flex h-full w-full max-w-md flex-col border-l border-borde bg-fondo shadow-2xl"
      >
        <header class="flex items-start gap-3 border-b border-borde px-5 py-4">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h2 class="font-semibold">Buzón de prueba</h2>
              <Insignia tono="aviso">Solo prototipo</Insignia>
            </div>
            <p class="mt-1 text-[13px] text-suave">
              Aquí llegan los correos, SMS y WhatsApp que el sistema enviaría. Los enlaces y códigos funcionan.
            </p>
          </div>
          <button
            type="button"
            class="flex size-8 items-center justify-center rounded-md text-tenue hover:bg-superficie-2 hover:text-texto"
            aria-label="Cerrar buzón"
            @click="cerrar"
          >
            <X class="size-4" />
          </button>
        </header>
        <div class="flex-1 space-y-2.5 overflow-y-auto p-4">
          <Vacio v-if="mensajes.length === 0" :icono="Inbox" titulo="Sin mensajes todavía">
            Pruebe «¿Olvidó su contraseña?» o cambie su correo en el perfil para ver los mensajes aquí.
          </Vacio>
          <article
            v-for="m in mensajes"
            :key="m.id"
            :class="cn('rounded-xl border p-3.5', m.leido ? 'border-borde bg-superficie' : 'border-acento/30 bg-acento-tenue')"
          >
            <header class="mb-1.5 flex items-center gap-2 text-[12px] text-tenue">
              <component :is="CANAL[m.canal].icono" class="size-3.5" />
              <span class="font-medium text-suave">{{ CANAL[m.canal].nombre }}</span>
              <span class="truncate">· {{ m.destino }}</span>
              <span class="num ml-auto shrink-0">{{ formatearMarcaTiempo(m.creadoEn).slice(-5) }}</span>
            </header>
            <p class="text-[13.5px] font-medium">{{ m.asunto }}</p>
            <p class="mt-1 text-[13px] leading-relaxed text-suave">{{ m.cuerpo }}</p>
            <div v-if="m.codigo || m.enlace" class="mt-3 flex flex-wrap items-center gap-2">
              <button
                v-if="m.codigo"
                type="button"
                class="inline-flex items-center gap-2 rounded-lg border border-borde bg-superficie-2 px-2.5 py-1 font-mono text-[15px] tracking-[0.25em] hover:border-acento"
                title="Copiar código"
                @click="copiar(m.codigo)"
              >
                {{ m.codigo }}
                <Copy class="size-3.5 text-tenue" />
              </button>
              <Boton v-if="m.enlace" tamano="sm" variante="primario" :icono-derecha="ExternalLink" @click="abrirEnlace(m.enlace)">
                Abrir enlace
              </Boton>
            </div>
          </article>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

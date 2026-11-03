<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue"
import { Plus, Trash2 } from "@lucide/vue"
import { Boton, Dialogo, Entrada, Vacio } from "@/shared/ui"
import { claveFiltro } from "./preparar"

const p = defineProps<{ abierto: boolean; ignoradas: string[]; guardando: boolean }>()
const emit = defineEmits<{ cerrar: []; guardar: [lista: string[]] }>()

type Fila = { id: number; texto: string }
let siguiente = 1
const filas = ref<Fila[]>([])
const nueva = ref("")
const lista = ref<HTMLUListElement>()

// Cada apertura parte de la lista guardada.
watch(
  () => p.abierto,
  (a) => {
    if (!a) return
    filas.value = p.ignoradas.map((texto) => ({ id: siguiente++, texto }))
    nueva.value = ""
  },
  { immediate: true },
)

/** Filas cuyo texto, normalizado, ya aparece antes en la lista. */
const repetidas = computed(() => {
  const vistas = new Set<string>()
  const r = new Set<number>()
  for (const f of filas.value) {
    const k = claveFiltro(f.texto)
    if (!k) continue
    if (vistas.has(k)) r.add(f.id)
    vistas.add(k)
  }
  return r
})
const yaExiste = computed(() => {
  const k = claveFiltro(nueva.value)
  return !!k && filas.value.some((f) => claveFiltro(f.texto) === k)
})
const resultado = computed(() => {
  const vistas = new Set<string>()
  return filas.value
    .map((f) => f.texto.trim())
    .filter((t) => {
      const k = claveFiltro(t)
      if (!k || vistas.has(k)) return false
      vistas.add(k)
      return true
    })
})
const sinCambios = computed(
  () =>
    resultado.value.length === p.ignoradas.length &&
    resultado.value.every((t, i) => t === p.ignoradas[i]),
)

async function agregar() {
  const t = nueva.value.trim()
  if (!t || yaExiste.value) return
  filas.value = [...filas.value, { id: siguiente++, texto: t }]
  nueva.value = ""
  await nextTick()
  lista.value?.lastElementChild?.scrollIntoView({ block: "nearest" })
}
const quitar = (id: number) => (filas.value = filas.value.filter((f) => f.id !== id))
</script>

<template>
  <Dialogo
    :abierto="abierto"
    ancho="md"
    titulo="Columnas excluidas de todas las importaciones"
    descripcion="Las columnas cuyo título coincida con esta lista se marcan como «No importar» al leer cualquier planilla. No se distinguen mayúsculas ni tildes: «Teléfono» excluye también «TELEFONO»."
    @cerrar="!guardando && emit('cerrar')"
  >
    <form class="flex items-end gap-2" @submit.prevent="agregar">
      <label class="min-w-0 flex-1 text-[12.5px] text-tenue">
        Agregar columna
        <Entrada
          v-model="nueva"
          class="mt-1"
          placeholder="Ej.: Observaciones internas"
          maxlength="120"
          :invalido="yaExiste"
          :aria-describedby="yaExiste ? 'excluida-repetida' : undefined"
        />
      </label>
      <Boton type="submit" :icono="Plus" :disabled="!nueva.trim() || yaExiste">Agregar</Boton>
    </form>
    <p v-if="yaExiste" id="excluida-repetida" class="mt-1 text-[12px] text-peligro">Esa columna ya está en la lista.</p>

    <div class="mt-4">
      <Vacio v-if="!filas.length" titulo="No hay columnas excluidas">
        Todas las columnas se ofrecen para importar.
      </Vacio>
      <ul v-else ref="lista" class="max-h-80 space-y-2 overflow-y-auto pr-1" aria-label="Columnas excluidas">
        <li v-for="(f, i) in filas" :key="f.id">
          <div class="flex items-center gap-2">
            <Entrada
              v-model="f.texto"
              class="flex-1"
              tamano="sm"
              maxlength="120"
              :aria-label="`Columna excluida ${i + 1}`"
              :invalido="repetidas.has(f.id) || !f.texto.trim()"
            />
            <Boton
              tamano="sm"
              variante="fantasma"
              solo-icono
              :icono="Trash2"
              :aria-label="`Quitar «${f.texto || 'columna vacía'}»`"
              @click="quitar(f.id)"
            />
          </div>
          <p v-if="repetidas.has(f.id)" class="mt-0.5 text-[12px] text-aviso">
            Repetida: se guardará una sola vez.
          </p>
          <p v-else-if="!f.texto.trim()" class="mt-0.5 text-[12px] text-aviso">Vacía: no se guardará.</p>
        </li>
      </ul>
    </div>

    <template #pie>
      <Boton :disabled="guardando" @click="emit('cerrar')">Cancelar</Boton>
      <Boton variante="primario" :cargando="guardando" :disabled="sinCambios" @click="emit('guardar', resultado)">
        Guardar lista
      </Boton>
    </template>
  </Dialogo>
</template>

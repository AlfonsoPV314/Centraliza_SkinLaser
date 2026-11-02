<script setup lang="ts">
import { ref } from "vue"
import { useRouter } from "vue-router"
import { ChevronsUpDown, CircleUser, LogOut, Moon, Sun, Users } from "@lucide/vue"
import { useSesion } from "@/application"
import { useClickFuera } from "@/shared/hooks"
import { cn } from "@/shared/ui"

const sesion = useSesion()
const router = useRouter()
const abierto = ref(false)
const raiz = ref<HTMLDivElement>()
useClickFuera(raiz, () => (abierto.value = false), abierto)

const iniciales = (n: string) =>
  n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("")
const ir = (r: string) => {
  router.push(r)
  abierto.value = false
}
const alternarTema = () => {
  const t = sesion.usuario.value?.preferencias.tema
  sesion.guardarPreferencias({ tema: t === "oscuro" ? "claro" : "oscuro" })
}
const item = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] hover:bg-superficie-2"
</script>

<template>
  <div v-if="sesion.usuario.value" ref="raiz" class="relative">
    <button
      type="button"
      class="flex h-9 items-center gap-2 rounded-lg pr-2 pl-1 hover:bg-superficie-2"
      :aria-expanded="abierto"
      aria-haspopup="menu"
      @click="abierto = !abierto"
    >
      <span class="flex size-7 items-center justify-center rounded-full bg-acento-tenue text-[11px] font-semibold text-acento">
        {{ iniciales(sesion.usuario.value.nombreUsuario) }}
      </span>
      <span class="hidden text-left leading-tight sm:block">
        <span class="block text-[13px] font-medium">{{ sesion.usuario.value.nombreUsuario }}</span>
        <span class="block text-[11px] text-tenue">{{ sesion.esAdmin.value ? "Administrador" : "Usuario" }}</span>
      </span>
      <ChevronsUpDown class="size-3.5 text-tenue" />
    </button>
    <div
      v-if="abierto"
      role="menu"
      class="animar-aparecer absolute right-0 z-40 mt-2 w-64 rounded-xl border border-borde bg-superficie p-1.5 shadow-2xl"
    >
      <div class="border-b border-borde px-2.5 pt-1.5 pb-2.5">
        <p class="text-sm font-medium">{{ sesion.usuario.value.nombreUsuario }}</p>
        <p class="truncate text-[12.5px] text-tenue">{{ sesion.usuario.value.correo }}</p>
      </div>
      <div class="pt-1.5">
        <button role="menuitem" type="button" :class="item" @click="ir('/perfil')">
          <CircleUser class="size-4 text-tenue" /> Mi perfil
        </button>
        <button v-if="sesion.esAdmin.value" role="menuitem" type="button" :class="item" @click="ir('/admin/usuarios')">
          <Users class="size-4 text-tenue" /> Usuarios y roles
        </button>
        <button role="menuitem" type="button" :class="item" @click="alternarTema">
          <template v-if="sesion.usuario.value.preferencias.tema === 'oscuro'">
            <Sun class="size-4 text-tenue" /> Usar tema claro
          </template>
          <template v-else><Moon class="size-4 text-tenue" /> Usar tema oscuro</template>
        </button>
        <div class="my-1 border-t border-borde" />
        <button role="menuitem" type="button" :class="cn(item, 'text-peligro')" @click="sesion.cerrar('manual')">
          <LogOut class="size-4" /> Cerrar sesión
        </button>
      </div>
    </div>
  </div>
</template>

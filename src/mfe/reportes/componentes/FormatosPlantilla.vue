<script setup lang="ts">
import { computed } from "vue"
import { FileSpreadsheet, FileText } from "@lucide/vue"
import { tipoSalida, type Plantilla } from "@/domain/templates"
import { Insignia } from "@/shared/ui"

const p = defineProps<{ plantilla: Pick<Plantilla, "archivos"> }>()
const t = computed(() => tipoSalida(p.plantilla))
</script>

<template>
  <div class="flex gap-1">
    <Insignia v-if="t === 'excel' || t === 'ambos'" tono="exito" :icono="FileSpreadsheet">Excel</Insignia>
    <Insignia v-if="t === 'pdf' || t === 'ambos'" tono="peligro" :icono="FileText">PDF</Insignia>
    <Insignia v-if="!t">Sin archivos</Insignia>
  </div>
</template>

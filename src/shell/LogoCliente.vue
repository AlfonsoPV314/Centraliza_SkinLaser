<script setup lang="ts">
import logoSkinLaser from "@/assets/skinlaser-logo.png"
import { MARCA } from "@/config/brand"
</script>

<template>
  <img :src="logoSkinLaser" :alt="`${MARCA.cliente} · ${MARCA.descripcionCliente}`" class="size-16 object-contain" />
</template>

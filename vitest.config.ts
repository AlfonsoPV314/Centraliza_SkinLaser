import { defineConfig } from "vitest/config"
import path from "node:path"

// Configuración independiente de vite.config.ts para no cargar los plugins del entorno de Figma Make.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
})

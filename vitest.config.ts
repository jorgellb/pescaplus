import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Las pruebas NUNCA tocan la base de datos ni servicios reales: ver el fichero.
    setupFiles: ['./tests/sin-servicios-reales.ts'],
  },
})

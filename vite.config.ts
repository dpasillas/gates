/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/gates/',
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'build',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    // Stylesheets are stubbed out under test by default, which would leave the board's styles empty
    // where they are read as text to be carried inside an exported image.
    css: true,
  },
})

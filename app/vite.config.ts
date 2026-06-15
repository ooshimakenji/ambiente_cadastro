import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativa (espelha dashboard_servicos). Proxy /api → backend local na fase de dev.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      // /api/* (cliente) → backend na raiz (/auth, /ordens, ...). Remove o prefixo /api.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
})

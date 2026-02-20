import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Solon Dashboard',
        short_name: 'Solon',
        description: 'Self-hosted AI runtime dashboard',
        theme_color: '#1a1a2e',
        background_color: '#f8f9fb',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8420',
      '/v1': 'http://localhost:8420',
    },
  },
})

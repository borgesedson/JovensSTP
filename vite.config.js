import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      srcDir: 'src',
      filename: 'sw.js',
      strategies: 'injectManifest',
      registerType: 'autoUpdate',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      includeAssets: [
        'generated-icons/manifest-icon-192.maskable.png',
        'generated-icons/manifest-icon-512.maskable.png'
      ],
      manifest: {
        name: 'JovensSTP — Networking para Jovens de São Tomé e Príncipe',
        short_name: 'JovensSTP',
        description: 'Conecta jovens e empresas em São Tomé e Príncipe para oportunidades, networking e crescimento profissional.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/generated-icons/manifest-icon-192.maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/generated-icons/manifest-icon-512.maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
    }),
  ],
  server: {
    host: true, // expose on local network (0.0.0.0)
    port: 5173,
  },
})

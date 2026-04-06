import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32x32.png', 'favicon-16x16.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'BunnyCure - Gestión de Centro Estético',
        short_name: 'BunnyCure',
        description: 'Sistema de gestión de reservas, agenda y seguimiento de clientas para centro estético',
        theme_color: '#ff6b9d',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 año
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 días
              }
            }
          },
          // API de autenticación - NetworkOnly (nunca cachear)
          {
            urlPattern: /\/api\/auth\/(login|logout|me)/i,
            handler: 'NetworkOnly'
          },
          // Otras APIs - NetworkFirst con timeout corto
          {
            urlPattern: /\/api\/.*\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 2 // Solo 2 minutos para evitar datos stale
              },
              networkTimeoutSeconds: 5, // Timeout más corto
              plugins: [
                {
                  cacheWillUpdate: async ({ response }: { response: Response }) => {
                    // Solo cachear respuestas exitosas
                    if (response.status === 200) {
                      return response;
                    }
                    return null;
                  },
                },
              ],
            }
          },
          // Páginas de la app - NetworkFirst para tener siempre última versión
          {
            urlPattern: /\/(?:dashboard|customers|appointments|services|booking-requests)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              networkTimeoutSeconds: 3
            }
          }
        ],
        cleanupOutdatedCaches: true,
        // CRÍTICO: skipWaiting en false para evitar problemas con cookies
        // El service worker esperará hasta que todas las pestañas estén cerradas
        skipWaiting: false,
        clientsClaim: true,
        // No cachear redirects ni errores
        navigateFallback: null,
      },
      devOptions: {
        enabled: false // Deshabilitar en desarrollo para evitar conflictos
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

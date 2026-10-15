import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

const appBuildId =
  process.env.VITE_APP_BUILD_ID ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  `local-${Date.now()}`

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(appBuildId),
  },
  plugins: [
    react(),
    {
      name: 'dynamic-card-manifest',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && (req.url.startsWith('/manifest-card.json') || req.url.startsWith('/api/manifest-card'))) {
            const url = new URL(req.url, 'http://localhost');
            const id = url.searchParams.get('id') || '';
            const nameParam = url.searchParams.get('name') || 'Club';
            let firstName = 'Club';
            try {
              firstName = decodeURIComponent(nameParam);
            } catch {
              firstName = nameParam;
            }
            const cardPath = id ? `/mi-tarjeta/${id}` : '/';

            res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
            res.end(
              JSON.stringify({
                id: cardPath,
                name: `Bunny Pass - ${firstName}`,
                short_name: 'Bunny Pass',
                description: `Tarjeta de fidelización digital BunnyCure Club de ${firstName}`,
                theme_color: '#FDFCF8',
                background_color: '#FDFCF8',
                display: 'standalone',
                scope: '/',
                start_url: cardPath,
                orientation: 'portrait',
                icons: [
                  {
                    src: '/icon-192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any',
                  },
                  {
                    src: '/icon-512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any',
                  },
                  {
                    src: '/icon-maskable-512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'maskable',
                  },
                ],
              })
            );
            return;
          }
          next();
        });
      },
    },
    VitePWA({
      filename: 'pwa-sw.js',
      injectRegister: false,
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32x32.png', 'favicon-16x16.png', 'apple-touch-icon.png'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
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
          // APIs del backend - NetworkOnly (nunca servir desde caché obsoleta en citas, caja, inventario, etc.)
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkOnly',
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
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-icons': ['lucide-react', 'react-icons'],
          'vendor-utils': ['date-fns', 'axios', 'zustand', 'yup'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

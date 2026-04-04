# ✅ Configuración PWA Completa - Próximos Pasos

## 📋 Resumen de Cambios

### ✅ Archivos Creados/Modificados

#### Configuración Base
- ✅ `package.json` - Agregadas dependencias `vite-plugin-pwa` y `workbox-window`
- ✅ `vite.config.ts` - Configurado plugin PWA con Workbox
- ✅ `public/manifest.json` - Manifest completo con metadata y shortcuts
- ✅ `index.html` - Meta tags PWA, Apple y Microsoft

#### Componentes React
- ✅ `src/components/PWAUpdatePrompt.tsx` - Banner de actualización disponible
- ✅ `src/components/OfflineIndicator.tsx` - Indicador de modo offline
- ✅ `src/components/InstallPWA.tsx` - Toast de instalación PWA
- ✅ `src/utils/pwa.ts` - Hooks personalizados para PWA

#### Iconos (Placeholders SVG)
- ✅ `public/icon-192.svg` - Icono 192x192 temporal
- ✅ `public/icon-512.svg` - Icono 512x512 temporal
- ✅ `public/icon-maskable-512.svg` - Icono maskable temporal

#### Documentación
- ✅ `ICONOS-PWA.md` - Guía para generar iconos definitivos
- ✅ `SETUP-PWA.md` - Este archivo

---

## 🚀 Pasos para Probar la PWA

### 1️⃣ Instalar Dependencias

```bash
cd C:\Users\alfre\IdeaProjects\bunnycure-frontend

# Si el primer intento falla, limpiar y reinstalar
rm -rf node_modules package-lock.json
npm install
```

**⚠️ Nota sobre versión de Vite:**
Se usa Vite 6.x (no 8.x) porque es la última versión soportada por `vite-plugin-pwa`.
Ver `SOLUCION-DEPENDENCIAS.md` para más detalles.

Esto instalará:
- `vite-plugin-pwa@^0.21.1`
- `workbox-window@^7.3.0`

### 2️⃣ Iniciar Backend (Terminal 1)

```bash
cd C:\Users\alfre\IdeaProjects\bunnycure
set SPRING_PROFILES_ACTIVE=local
set BUNNYCURE_ADMIN_USERNAME=admin
set BUNNYCURE_ADMIN_PASSWORD=admin123

mvnw.cmd spring-boot:run
```

Esperar a que inicie en `http://localhost:8080`

### 3️⃣ Iniciar Frontend en Modo Desarrollo (Terminal 2)

```bash
cd C:\Users\alfre\IdeaProjects\bunnycure-frontend
npm run dev
```

**⚠️ IMPORTANTE**: En modo desarrollo (`npm run dev`), el Service Worker está **deshabilitado** para evitar problemas de caché.

Para probar PWA features en desarrollo, cambia temporalmente en `vite.config.ts`:
```typescript
devOptions: {
  enabled: true // Cambiar a true solo para testing PWA
}
```

### 4️⃣ Hacer Build de Producción (Recomendado para PWA)

Para probar la PWA completa con Service Worker:

```bash
# Build
npm run build

# Previsualizar build con Service Worker activo
npm run preview
```

Esto iniciará el servidor de preview en `http://localhost:4173` (puerto por defecto)

---

## 🧪 Testing de PWA Features

### A. Testing en Chrome Desktop

1. Abrir `http://localhost:4173` (después de `npm run preview`)

2. **Verificar Manifest**:
   - DevTools > Application > Manifest
   - Debe mostrar:
     - Name: "BunnyCure - Gestión de Centro Estético"
     - Theme color: `#ff6b9d`
     - 3 iconos (192, 512, maskable)
     - 3 shortcuts (Dashboard, Agenda, Nueva Reserva)

3. **Verificar Service Worker**:
   - DevTools > Application > Service Workers
   - Debe aparecer un Service Worker registrado
   - Estado: "activated and is running"

4. **Verificar Instalabilidad**:
   - Debe aparecer icono de instalación en la barra de direcciones (➕)
   - O Toast de instalación en la esquina inferior derecha

5. **Testing Offline**:
   - DevTools > Network > Throttling > Offline
   - Refrescar página
   - Debe aparecer banner amarillo "Sin conexión"
   - La app debe seguir funcionando (caché)

6. **Lighthouse Audit**:
   - DevTools > Lighthouse
   - Seleccionar "Progressive Web App"
   - Run audit
   - **Objetivo: Score > 90**

### B. Testing en Chrome Android

1. Abrir Chrome en Android
2. Navegar a tu URL (necesitas exponer localhost o usar ngrok/Railway)
3. Menu > "Instalar app" o "Add to Home screen"
4. Instalar la PWA
5. Abrir desde el home screen
6. Debe abrir en modo standalone (sin barra del navegador)

### C. Testing en Safari iOS

**⚠️ Nota**: iOS tiene soporte limitado de PWA:
- ✅ Instalación desde Share > "Add to Home Screen"
- ✅ Modo standalone
- ✅ Manifest básico
- ❌ Service Worker limitado
- ❌ Push notifications no soportadas
- ❌ beforeinstallprompt no soportado

---

## 📊 Checklist de Validación PWA

### Core PWA Requirements

- [ ] **Manifest.json** válido y completo
- [ ] **Service Worker** registrado y funcionando
- [ ] **HTTPS** en producción (localhost OK para desarrollo)
- [ ] **Iconos** en todos los tamaños requeridos
- [ ] **Instalable** (prompt de instalación aparece)
- [ ] **Funciona offline** (al menos página de fallback)

### User Experience

- [ ] **Theme color** se refleja en la barra de navegador móvil
- [ ] **Splash screen** se genera automáticamente (en Android)
- [ ] **Standalone mode** funciona sin barra del navegador
- [ ] **Updates** se detectan y muestran prompt de actualización
- [ ] **Offline indicator** aparece cuando no hay conexión

### Performance

- [ ] **Lighthouse PWA score** > 90
- [ ] **Recursos críticos** precacheados
- [ ] **Assets estáticos** en caché
- [ ] **API calls** con network-first strategy

---

## 🎨 Generar Iconos Definitivos

Los iconos actuales son **placeholders SVG**. Para producción, necesitas generar PNG:

### Opción 1: PWA Builder (Online - Más fácil)
1. Ir a https://www.pwabuilder.com/imageGenerator
2. Subir logo de BunnyCure (mínimo 512x512)
3. Generar todos los iconos
4. Reemplazar archivos en `public/`

### Opción 2: ImageMagick (Local)
Ver instrucciones completas en `ICONOS-PWA.md`

**Archivos a generar**:
- `icon-192.png`
- `icon-512.png`
- `icon-maskable-512.png`
- `apple-touch-icon.png` (180x180)
- `favicon.ico` (opcional)

**Una vez generados**, actualizar:
- `public/manifest.json` (cambiar extensiones de .svg a .png)
- `vite.config.ts` (cambiar type de image/svg+xml a image/png)
- `index.html` (actualizar referencias)

---

## 🔧 Configuración Avanzada

### Estrategias de Caché Personalizadas

El `vite.config.ts` ya incluye:

1. **Google Fonts**: CacheFirst (1 año)
2. **CDN Assets**: CacheFirst (30 días)
3. **API Calls**: NetworkFirst con timeout de 10s (5 minutos)

Para agregar más rutas personalizadas, edita `workbox.runtimeCaching` en `vite.config.ts`.

### Modo Desarrollo con Service Worker

Por defecto, el SW está deshabilitado en dev. Para habilitarlo:

```typescript
// vite.config.ts
devOptions: {
  enabled: true,
  type: 'module'
}
```

**⚠️ Cuidado**: El caché puede causar problemas en desarrollo. Limpia caché frecuentemente.

---

## 🐛 Troubleshooting

### Service Worker no se registra

1. Verificar que estás en `npm run preview` (no `dev`)
2. Verificar consola de errores
3. Verificar que manifest.json no tiene errores de sintaxis
4. Limpiar caché: DevTools > Application > Clear storage

### Prompt de instalación no aparece

1. Verificar que Lighthouse PWA score > 80
2. Verificar que no estás en modo incógnito
3. Verificar que la app no está ya instalada
4. Algunos navegadores requieren "engagement" (visitar 2+ veces)

### App no funciona offline

1. Verificar Service Worker está activo
2. Verificar estrategia de caché en DevTools > Application > Cache Storage
3. Forzar actualización del Service Worker
4. Verificar `workbox.globPatterns` incluye los assets necesarios

### Actualizaciones no se detectan

1. Verificar `registerType: 'autoUpdate'` en vite.config.ts
2. Verificar que el componente `<PWAUpdatePrompt />` está en App.tsx
3. Cambiar algo en el código, hacer build nuevo
4. Recargar la app: debe aparecer prompt de actualización

---

## 📚 Recursos Adicionales

### Documentación Oficial
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [PWA Checklist](https://web.dev/pwa-checklist/)

### Herramientas de Testing
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [PWA Builder](https://www.pwabuilder.com/)
- [Maskable Icon Editor](https://maskable.app/editor)

### Debugging
- Chrome: DevTools > Application
- Firefox: DevTools > Application > Service Workers
- Safari: Develop > Service Workers

---

## ✅ Status de Implementación

| Feature | Status | Notas |
|---------|--------|-------|
| Plugin instalado | ✅ Done | package.json actualizado |
| Vite configurado | ✅ Done | vite.config.ts con PWA + Workbox |
| Manifest completo | ✅ Done | manifest.json con shortcuts y metadata |
| HTML meta tags | ✅ Done | index.html con Apple/MS/PWA tags |
| Service Worker | ✅ Done | Workbox con estrategias de caché |
| Componentes PWA | ✅ Done | UpdatePrompt, Offline, Install |
| Iconos placeholder | ✅ Done | SVG temporales (BC logo) |
| Iconos definitivos | ⏳ Todo | Ver ICONOS-PWA.md para generar PNG |
| Testing PWA | ⏳ Todo | Pendiente npm install + build + preview |

**8 de 9 tareas completadas** ✅

---

## 🎯 Siguiente Fase: Testing y Validación

Solo queda 1 tarea pendiente:

### Testing PWA Completo ⏳
Una vez que ejecutes `npm install`:
- Validar con Lighthouse (objetivo: score > 90)
- Testing en Chrome/Safari móvil
- Validar instalabilidad
- Verificar offline mode
- Confirmar Service Worker funciona

---

## 🎯 Siguiente Tarea

1. **Ejecutar** `npm install` en el frontend
2. **Hacer build** con `npm run build`
3. **Probar** con `npm run preview`
4. **Validar** con Lighthouse (objetivo: score > 90)
5. **Generar iconos definitivos** cuando estés listo (ver ICONOS-PWA.md)
6. **Desplegar** a producción (Railway/Vercel/Netlify)

---

**¡La configuración PWA está completa!** 🎉

Ahora solo necesitas instalar dependencias y probar.


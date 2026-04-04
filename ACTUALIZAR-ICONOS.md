# 🎨 Organización de Iconos PWA

## Iconos Disponibles

Ya tienes iconos profesionales en:
- `appstore-images/android/` - Iconos Android (6 tamaños)
- `appstore-images/ios/` - Iconos iOS (26 tamaños!)

## 📋 Tareas de Configuración

### 1. Copiar iconos necesarios a la raíz de public/

```powershell
cd C:\Users\alfre\IdeaProjects\bunnycure-frontend\public

# Copiar iconos Android para PWA
copy appstore-images\android\launchericon-192x192.png icon-192.png
copy appstore-images\android\launchericon-512x512.png icon-512.png

# Copiar icono iOS para Apple
copy appstore-images\ios\180.png apple-touch-icon.png

# Copiar favicon
copy appstore-images\ios\32.png favicon-32x32.png
copy appstore-images\ios\16.png favicon-16x16.png
```

### 2. Crear icono maskable

El icono maskable necesita 10% de padding para Android. Puedes:
- **Opción A**: Usar el mismo 512x512 (si ya tiene padding)
  ```powershell
  copy appstore-images\android\launchericon-512x512.png icon-maskable-512.png
  ```
  
- **Opción B**: Generarlo con https://maskable.app/editor
  1. Subir `appstore-images/android/launchericon-512x512.png`
  2. Ajustar padding si es necesario
  3. Descargar como `icon-maskable-512.png`
  4. Copiar a `public/`

### 3. Actualizar manifest.json

Cambiar de SVG a PNG:

```json
"icons": [
  {
    "src": "/icon-192.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "any"
  },
  {
    "src": "/icon-512.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "any"
  },
  {
    "src": "/icon-maskable-512.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "maskable"
  }
]
```

### 4. Actualizar vite.config.ts

Cambiar en el objeto `manifest` dentro de `VitePWA()`:

```typescript
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
```

### 5. Actualizar index.html

```html
<!-- Favicon -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

<!-- Apple Touch Icon -->
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

### 6. Rebuild

```powershell
npm run build
npm run preview
```

---

## 🗑️ Limpieza (Opcional)

Una vez que todo funcione con PNG, puedes eliminar los SVG placeholders:

```powershell
del icon-192.svg
del icon-512.svg
del icon-maskable-512.svg
```

---

## ✅ Estructura Final Esperada

```
public/
├── appstore-images/        (mantener para referencia)
│   ├── android/
│   ├── ios/
│   └── windows/
├── icon-192.png           ✅ Copiado de android/
├── icon-512.png           ✅ Copiado de android/
├── icon-maskable-512.png  ✅ Generado o copiado
├── apple-touch-icon.png   ✅ Copiado de ios/180.png
├── favicon-32x32.png      ✅ Copiado de ios/32.png
├── favicon-16x16.png      ✅ Copiado de ios/16.png
├── favicon.svg            ✅ Mantener
├── icons.svg              ✅ Mantener
└── manifest.json          ✅ Actualizar
```

---

**Ejecuta los comandos de copia primero!**

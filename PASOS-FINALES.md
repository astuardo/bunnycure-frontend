# 🔧 Comandos para Completar la Instalación PWA

## ⚠️ NO ejecutar `npm audit fix --force`

**Razón**: Baja automáticamente `vite-plugin-pwa` a versión 0.19.8 (incompatible con Vite 6.x)

Las vulnerabilidades reportadas son en `serialize-javascript` dentro de `workbox-build`, que es una **dev dependency** usada solo en build time, NO en runtime. **No son un riesgo de seguridad real para tu aplicación.**

---

## ✅ Pasos Finales (Ejecutar en Windows PowerShell)

### 1. Reinstalar vite-plugin-pwa en versión correcta

```powershell
cd C:\Users\alfre\IdeaProjects\bunnycure-frontend

# Desinstalar versión incorrecta
npm uninstall vite-plugin-pwa

# Instalar versión correcta
npm install -D vite-plugin-pwa@^0.21.1
```

### 2. Verificar versiones instaladas

```powershell
npm list vite @vitejs/plugin-react vite-plugin-pwa workbox-window
```

**Debe mostrar:**
```
vite@6.4.1
@vitejs/plugin-react@5.2.0
vite-plugin-pwa@0.21.2
workbox-window@7.4.0
```

### 3. Verificar que dev server funciona

```powershell
npm run dev
```

Deberías ver:
```
VITE v6.4.1  ready in XXX ms
➜  Local:   http://localhost:5173/
```

**Abre** `http://localhost:5173/` y verifica que la app carga sin errores.

### 4. Hacer build de producción

```powershell
npm run build
```

Debería compilar sin errores TypeScript y generar la carpeta `dist/`.

### 5. Probar PWA con preview

```powershell
npm run preview
```

Abre `http://localhost:4173/` y:
- ✅ Verifica que la app funciona
- ✅ Abre DevTools > Application > Manifest (debe mostrar info de BunnyCure)
- ✅ Abre DevTools > Application > Service Workers (debe estar registrado)

### 6. Testing con Lighthouse (Opcional pero recomendado)

1. Con la app abierta en `http://localhost:4173/`
2. DevTools (F12) > Lighthouse tab
3. Selecciona "Progressive Web App"
4. Click "Analyze page load"
5. **Meta: PWA Score > 90**

---

## 📋 Cambios Aplicados para Resolver Errores

### TypeScript Configuration

**Archivo**: `tsconfig.app.json`

**Cambios:**
```diff
- "verbatimModuleSyntax": true,
+ "isolatedModules": true,
- "erasableSyntaxOnly": true,
```

**Razón**: 
- `verbatimModuleSyntax` requería imports explícitos de tipo (`import type {...}`)
- `erasableSyntaxOnly` no permitía enums (necesarios para AppointmentStatus, etc.)
- `isolatedModules` es suficiente para Vite

### Tipos PWA

**Archivo**: `src/vite-env.d.ts` (creado)

```typescript
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
```

**Razón**: Define los tipos para el módulo virtual `virtual:pwa-register/react`

### Package.json

**Versión correcta**: `vite-plugin-pwa@^0.21.1`

---

## 🐛 Sobre las Vulnerabilidades de Seguridad

### serialize-javascript en workbox-build

```
4 high severity vulnerabilities
```

**¿Es peligroso?** NO para producción.

**Por qué:**
1. `workbox-build` es una **dev dependency**
2. Solo se usa durante `npm run build` (generación del Service Worker)
3. NO está incluido en el bundle final que se envía al navegador
4. Las vulnerabilidades son de ejecución de código, que solo afectarían durante el build
5. El build se ejecuta en tu máquina, no en servidor público

**Solución recomendada:**
- ⏳ Esperar a que Workbox actualice `serialize-javascript`
- ✅ Ignorar las vulnerabilidades de dev dependencies
- ❌ NO usar `npm audit fix --force` (rompe compatibilidad)

**Alternativa** (si realmente te preocupa):
```powershell
npm audit fix --production
```
Esto solo arregla vulnerabilidades en **production dependencies**, no en dev.

---

## ✅ Checklist Final

Antes de considerar la PWA lista:

- [ ] `npm install -D vite-plugin-pwa@^0.21.1` ejecutado
- [ ] `npm run dev` funciona sin errores
- [ ] `npm run build` compila exitosamente
- [ ] `npm run preview` sirve la app correctamente
- [ ] Service Worker visible en DevTools > Application
- [ ] Manifest.json válido en DevTools
- [ ] Lighthouse PWA score > 90 (opcional)
- [ ] Iconos PNG generados y reemplazados (cuando estés listo)

---

## 🚀 Próximos Pasos Después del Setup

Una vez que todo funciona:

1. **Generar iconos definitivos** (ver `ICONOS-PWA.md`)
2. **Testing en móvil** (Chrome Android + Safari iOS)
3. **Desplegar a producción** (Railway, Vercel, Netlify)
4. **Configurar HTTPS** (requerido para PWA en producción)

---

**¡Listo para probar tu PWA!** 🎉

Ejecuta los comandos en orden y reporta si hay algún error.

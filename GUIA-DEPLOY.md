# 🚀 Guía de Deploy - BunnyCure Frontend PWA

**Opciones:** Heroku vs Vercel  
**Recomendación:** Vercel (más fácil, gratis, optimizado para React)  
**Alternativa:** Heroku (más control, pero requiere configuración adicional)

---

## ✅ OPCIÓN 1: Vercel (RECOMENDADO)

### ¿Por qué Vercel?
- ✅ **Gratis** para proyectos personales
- ✅ **HTTPS automático** con SSL
- ✅ **Deploy en 2 minutos** (sin configuración)
- ✅ **Optimizado para Vite/React**
- ✅ **Auto-deploy** en cada push a GitHub
- ✅ **CDN global** ultrarrápido
- ✅ **Preview URLs** para cada PR

### 📋 Paso a Paso - Vercel

#### 1️⃣ Preparar Repositorio Git

```powershell
cd C:\Users\alfre\IdeaProjects\bunnycure-frontend

# Inicializar git si no está
git init

# Crear .gitignore
# (debería existir ya, verificar que incluya node_modules/ y dist/)
```

**Verificar `.gitignore`:**
```
node_modules/
dist/
.env.local
*.log
.DS_Store
```

```powershell
# Agregar archivos
git add .
git commit -m "feat: PWA completa - lista para deploy"

# Crear repositorio en GitHub (Web UI)
# 1. Ir a https://github.com/new
# 2. Nombre: bunnycure-frontend
# 3. Crear (sin README, ya tienes código)

# Conectar con GitHub
git remote add origin https://github.com/TU-USUARIO/bunnycure-frontend.git
git branch -M main
git push -u origin main
```

#### 2️⃣ Deploy con Vercel

**Opción A: Vercel CLI (Más Rápido)**

```powershell
# Instalar Vercel CLI globalmente
npm install -g vercel

# Login
vercel login
# Seleccionar: Continue with GitHub/Email

# Deploy desde el directorio del proyecto
cd C:\Users\alfre\IdeaProjects\bunnycure-frontend
vercel

# Responder preguntas:
# ? Set up and deploy? → Y
# ? Which scope? → tu-usuario
# ? Link to existing project? → N
# ? Project name? → bunnycure-frontend
# ? In which directory is your code located? → ./
# ? Override settings? → N (Vercel detecta Vite automáticamente)

# Esperar... ⏳
# ✅ Deploy completo!
# URL: https://bunnycure-frontend-xxx.vercel.app
```

**Opción B: Vercel Dashboard (Más Visual)**

1. Ir a https://vercel.com/signup
2. Seleccionar "Continue with GitHub"
3. Autorizar Vercel en GitHub
4. Click "New Project"
5. Import tu repositorio `bunnycure-frontend`
6. Configuración:
   - **Framework Preset:** Vite ✅ (detectado automáticamente)
   - **Root Directory:** ./
   - **Build Command:** `npm run build` (detectado)
   - **Output Directory:** `dist` (detectado)
7. **Environment Variables:**
   ```
   VITE_API_BASE_URL = https://bunnycure-b9a0d88cd51b.herokuapp.com
   VITE_APP_NAME = BunnyCure
   ```
8. Click "Deploy" 🚀
9. Esperar 1-2 minutos...
10. ✅ ¡Listo! URL: `https://bunnycure-frontend.vercel.app`

#### 3️⃣ Configurar CORS en Backend

```powershell
# Actualizar .env.production en BACKEND
cd C:\Users\alfre\IdeaProjects\bunnycure

# Editar src/main/resources/application-heroku.properties
```

**Agregar en `application-heroku.properties`:**
```properties
# Línea 57 (después de las líneas CORS existentes)
cors.allowed.origins=${CORS_ALLOWED_ORIGINS:http://localhost:5173,http://localhost:4173,https://bunnycure-frontend.vercel.app}
```

**O configurar en Heroku Dashboard:**
```bash
# Opción A: CLI
heroku config:set CORS_ALLOWED_ORIGINS="http://localhost:5173,http://localhost:4173,https://bunnycure-frontend.vercel.app" -a bunnycure

# Opción B: Dashboard Web
# 1. Ir a https://dashboard.heroku.com/apps/bunnycure
# 2. Settings > Config Vars > Reveal Config Vars
# 3. Add: CORS_ALLOWED_ORIGINS = http://localhost:5173,http://localhost:4173,https://bunnycure-frontend.vercel.app
```

**Commit y push backend:**
```powershell
git add .
git commit -m "feat: CORS para Vercel"
git push heroku main
# Esperar redeploy...
```

#### 4️⃣ Verificar Deploy

1. Abrir `https://bunnycure-frontend.vercel.app`
2. DevTools > Console
3. Verificar:
   - ✅ No errores CORS
   - ✅ API calls funcionan
   - ✅ Service Worker registrado
4. Lighthouse audit en producción:
   - F12 > Lighthouse > PWA
   - **Debe seguir dando 90+**

#### 5️⃣ Auto-Deploy Configurado

Ahora cada vez que hagas:
```powershell
git push origin main
```
**Vercel auto-deploya** en 1-2 minutos ✅

---

## 🔧 OPCIÓN 2: Heroku

### ¿Por qué Heroku?
- ✅ Todo en un solo lugar (backend + frontend)
- ✅ Control total
- ❌ Más complejo
- ❌ Requiere buildpack especial
- ❌ No tan rápido como Vercel CDN

### 📋 Paso a Paso - Heroku

#### 1️⃣ Preparar Repositorio Git

```powershell
cd C:\Users\alfre\IdeaProjects\bunnycure-frontend

git init
git add .
git commit -m "feat: PWA lista para Heroku"
```

#### 2️⃣ Crear App en Heroku

```powershell
# Login Heroku CLI
heroku login

# Crear app
heroku create bunnycure-frontend
# Output: https://bunnycure-frontend.herokuapp.com

# Agregar remote
git remote add heroku https://git.heroku.com/bunnycure-frontend.git
```

#### 3️⃣ Configurar Buildpack para Sitios Estáticos

Heroku no soporta Vite nativamente, necesitas buildpack especial:

```powershell
# Agregar buildpack Node.js
heroku buildpacks:add heroku/nodejs

# Configurar variables de entorno
heroku config:set VITE_API_BASE_URL="https://bunnycure-b9a0d88cd51b.herokuapp.com"
heroku config:set VITE_APP_NAME="BunnyCure"
```

#### 4️⃣ Crear Server Estático

Heroku necesita un servidor web para servir archivos estáticos.

**Crear `server.js` en la raíz del frontend:**

```javascript
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Servir archivos estáticos desde dist/
app.use(express.static(path.join(__dirname, 'dist')));

// Service Worker debe ser servido con header correcto
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(__dirname, 'dist', 'sw.js'));
});

// Manifest
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(path.join(__dirname, 'dist', 'manifest.json'));
});

// Redirigir todas las rutas a index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

#### 5️⃣ Actualizar package.json

```powershell
# Instalar Express
npm install express

# Verificar scripts en package.json
```

**Editar `package.json`:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "start": "node server.js"  // ← AGREGAR ESTO
  },
  "dependencies": {
    "express": "^4.18.2"  // ← AGREGAR ESTO
  }
}
```

#### 6️⃣ Crear Procfile

**Crear `Procfile` en la raíz (sin extensión):**
```
web: npm run build && npm start
```

#### 7️⃣ Deploy a Heroku

```powershell
# Agregar cambios
git add .
git commit -m "feat: Configurar para Heroku"

# Push a Heroku
git push heroku main

# Esperar build... ⏳
# Heroku ejecuta:
# 1. npm install
# 2. npm run build (genera dist/)
# 3. npm start (inicia express)

# Ver logs
heroku logs --tail

# Abrir app
heroku open
# URL: https://bunnycure-frontend.herokuapp.com
```

#### 8️⃣ Configurar CORS en Backend

```powershell
cd C:\Users\alfre\IdeaProjects\bunnycure

# Editar application-heroku.properties
# Agregar:
cors.allowed.origins=${CORS_ALLOWED_ORIGINS:http://localhost:5173,https://bunnycure-frontend.herokuapp.com}

# O variable de entorno
heroku config:set CORS_ALLOWED_ORIGINS="http://localhost:5173,https://bunnycure-frontend.herokuapp.com" -a bunnycure

# Push backend
git add .
git commit -m "feat: CORS para frontend Heroku"
git push heroku main
```

#### 9️⃣ Verificar Deploy

1. Abrir `https://bunnycure-frontend.herokuapp.com`
2. DevTools > Console
3. Verificar:
   - ✅ Service Worker registrado
   - ✅ No errores CORS
   - ✅ API funciona
4. Lighthouse audit

---

## 📊 Comparación: Vercel vs Heroku

| Feature | Vercel | Heroku |
|---------|--------|--------|
| **Setup** | 2 minutos | 15 minutos |
| **Complejidad** | Ninguna | Media |
| **HTTPS** | Automático | Automático |
| **CDN** | Global | Regional |
| **Auto-deploy** | Git push | Git push |
| **Velocidad** | ⚡⚡⚡ Ultrarrápido | ⚡⚡ Rápido |
| **Costo Free** | Ilimitado | 550 hrs/mes |
| **Configuración** | Zero-config | Buildpack + Server |
| **Dominio Custom** | Gratis | Gratis |
| **Preview URLs** | ✅ Sí | ❌ No |
| **Rollbacks** | ✅ 1-click | ⚠️ Manual |

---

## 🎯 Recomendación Final

### ✅ USA VERCEL SI:
- ✅ Quieres el deploy más rápido (2 minutos)
- ✅ No quieres configurar nada
- ✅ Quieres máxima velocidad (CDN global)
- ✅ Quieres preview URLs por PR
- ✅ Es tu primera vez desplegando React

### ⚙️ USA HEROKU SI:
- ✅ Ya tienes experiencia con Heroku
- ✅ Quieres todo en un solo lugar
- ✅ Necesitas lógica server-side en frontend
- ✅ No te importa configuración adicional

---

## 🆘 Troubleshooting

### Problema: CORS error en producción

**Solución:**
```bash
# Verificar CORS en backend
heroku config -a bunnycure
# Debe incluir tu dominio frontend

# Actualizar si falta
heroku config:set CORS_ALLOWED_ORIGINS="https://tu-frontend.vercel.app" -a bunnycure
```

### Problema: Service Worker no se registra

**Causa:** No hay HTTPS  
**Solución:** Vercel/Heroku dan HTTPS automático ✅

### Problema: 404 en rutas de React

**Vercel:** Se arregla automáticamente con `vercel.json`

**Crear `vercel.json` en raíz:**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Heroku:** Ya manejado en `server.js` con `app.get('*', ...)`

### Problema: Build falla en producción

```powershell
# Verificar que build funciona localmente
npm run build

# Ver errores de TypeScript
# Arreglar antes de deployar
```

---

## ✅ Checklist Pre-Deploy

- [ ] Build local exitoso (`npm run build`)
- [ ] Variables de entorno configuradas
- [ ] Git commit actualizado
- [ ] Backend CORS configurado con dominio frontend
- [ ] `.gitignore` incluye `node_modules/` y `dist/`
- [ ] HTTPS habilitado (automático en Vercel/Heroku)

---

## 🚀 ¡A Deployar!

**Mi recomendación:** Empieza con **Vercel** (más fácil).

Si luego quieres probar Heroku, es simple migrar.

**¿Listo?** Elige una opción y te guío paso a paso. 🎯

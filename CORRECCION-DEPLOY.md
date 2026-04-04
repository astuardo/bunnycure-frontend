# 🔧 Corrección Deploy - URL Backend Correcta

**Problema:** Frontend apuntaba a URL incorrecta del backend  
**URL Incorrecta:** `bunnycure-b9a0d88cd51b.herokuapp.com`  
**URL Correcta:** `bunnycure-04c4c179be8f.herokuapp.com`

---

## ✅ Correcciones Aplicadas

### 1. Frontend - .env.production Actualizado

**Antes:**
```env
VITE_API_BASE_URL=https://bunnycure-b9a0d88cd51b.herokuapp.com
```

**Ahora:**
```env
VITE_API_BASE_URL=https://bunnycure-04c4c179be8f.herokuapp.com
```

---

## 🚀 Pasos para Redeploy

### Opción 1: Vercel CLI (Rápido)

```powershell
cd C:\Users\alfre\IdeaProjects\bunnycure-frontend

# Commit cambios
git add .
git commit -m "fix: URL correcta del backend Heroku"
git push origin main

# Vercel auto-deploya en 1-2 minutos
# O forzar deploy inmediato:
vercel --prod
```

### Opción 2: Vercel Dashboard

1. Ir a https://vercel.com/dashboard
2. Seleccionar proyecto `bunnycure-frontend`
3. **Settings** > **Environment Variables**
4. Editar `VITE_API_BASE_URL`:
   ```
   VITE_API_BASE_URL = https://bunnycure-04c4c179be8f.herokuapp.com
   ```
5. **Deployments** > **...** (tres puntos) > **Redeploy**

---

## 🔧 Backend - Configurar CORS

Ahora que tienes la URL correcta, configura CORS en el backend:

```powershell
cd C:\Users\alfre\IdeaProjects\bunnycure

# Opción A: Variable de entorno Heroku (RECOMENDADO)
heroku config:set CORS_ALLOWED_ORIGINS="http://localhost:5173,http://localhost:4173,https://bunnycure-frontend.vercel.app" -a TU-APP-HEROKU

# Reemplaza TU-APP-HEROKU con el nombre real de tu app
# Si no recuerdas el nombre:
heroku apps
```

**O encuentra el nombre de tu app:**
```powershell
# Ver apps de Heroku
heroku apps

# Ejemplo de salida:
# === tu-email@gmail.com Apps
# bunnycure-backend (eu)
# my-other-app (us)
```

Luego usa ese nombre:
```powershell
heroku config:set CORS_ALLOWED_ORIGINS="http://localhost:5173,http://localhost:4173,https://bunnycure-frontend.vercel.app" -a NOMBRE-EXACTO
```

---

## ✅ Verificación Post-Deploy

### 1. Verificar Backend Activo

```powershell
# Probar endpoint público
curl https://bunnycure-04c4c179be8f.herokuapp.com/api/services?activeOnly=true
```

**Respuesta esperada:**
```json
[
  {
    "id": 1,
    "name": "Manicure + Brillo",
    "duration": 60,
    "price": 10000
  },
  ...
]
```

### 2. Verificar CORS

Abrir DevTools en:
```
https://bunnycure-frontend.vercel.app
```

**Console debe mostrar:**
```
✅ Service Worker registrado
```

**NO debe mostrar:**
```
❌ Access to XMLHttpRequest ... has been blocked by CORS policy
```

### 3. Test Completo

- [ ] Abrir https://bunnycure-frontend.vercel.app
- [ ] DevTools > Console: Sin errores CORS
- [ ] DevTools > Network: API calls con status 200
- [ ] Servicios cargan en la UI
- [ ] Service Worker activo
- [ ] App instalable

---

## 🐛 Troubleshooting

### Error: "has been blocked by CORS policy"

**Causa:** CORS no configurado en backend

**Solución:**
```powershell
heroku config:set CORS_ALLOWED_ORIGINS="http://localhost:5173,http://localhost:4173,https://bunnycure-frontend.vercel.app" -a TU-APP

# Reiniciar
heroku ps:restart -a TU-APP
```

### Error: 404 Not Found

**Causa:** Backend apagado o URL incorrecta

**Verificar URL:**
```powershell
# Ver apps de Heroku
heroku apps

# Ver info de la app
heroku info -a TU-APP

# Ver URL exacta
heroku domains -a TU-APP
```

**Verificar estado:**
```powershell
heroku ps -a TU-APP

# Si web=0, encender:
heroku ps:scale web=1 -a TU-APP
```

### Error: "Application Error" en Heroku

**Ver logs:**
```powershell
heroku logs --tail -a TU-APP
```

**Posibles causas:**
- Base de datos no configurada
- Variables de entorno faltantes
- Build fallido

---

## 📋 Checklist Final

### Frontend (Vercel)
- [ ] `.env.production` con URL correcta
- [ ] Variables de entorno en Vercel actualizadas
- [ ] Git push realizado
- [ ] Deploy exitoso en Vercel
- [ ] Frontend carga sin errores

### Backend (Heroku)
- [ ] CORS configurado con dominio Vercel
- [ ] Backend activo (web=1)
- [ ] Endpoint `/api/services` responde
- [ ] Sin errores en logs

### Testing
- [ ] Frontend en Vercel funciona
- [ ] API calls exitosos (status 200)
- [ ] Service Worker activo
- [ ] Sin errores CORS
- [ ] Lighthouse PWA > 90

---

## 🚀 Comandos Resumen (Copiar/Pegar)

```powershell
# FRONTEND - Redeploy con URL correcta
cd C:\Users\alfre\IdeaProjects\bunnycure-frontend
git add .
git commit -m "fix: URL correcta backend Heroku"
git push origin main

# BACKEND - Encontrar nombre de app
cd C:\Users\alfre\IdeaProjects\bunnycure
heroku apps

# BACKEND - Configurar CORS (reemplazar TU-APP)
heroku config:set CORS_ALLOWED_ORIGINS="http://localhost:5173,http://localhost:4173,https://bunnycure-frontend.vercel.app" -a TU-APP

# BACKEND - Reiniciar
heroku ps:restart -a TU-APP

# VERIFICAR - Backend
curl https://bunnycure-04c4c179be8f.herokuapp.com/api/services?activeOnly=true

# VERIFICAR - Frontend
# Abrir: https://bunnycure-frontend.vercel.app
# DevTools > Console > Verificar sin errores CORS
```

---

**Generado:** 2026-04-04 19:50 UTC  
**Última actualización:** URL backend corregida

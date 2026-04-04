# 🔧 Solución: Error de CORS

## 🔴 Problema

```
Access to XMLHttpRequest at 'https://bunnycure-b9a0d88cd51b.herokuapp.com/api/services?activeOnly=true' 
from origin 'http://localhost:4173' has been blocked by CORS policy
```

### Causa

El frontend está intentando conectarse al **backend de producción en Heroku**, pero ese servidor:
1. No tiene CORS configurado para `localhost:4173` (puerto de Vite preview)
2. Solo permite `localhost:5173` (puerto de Vite dev)

---

## ✅ Solución Aplicada

### Cambios en el Backend (bunnycure)

**1. Actualizado `CorsConfig.java`**:
```diff
- http://localhost:5173,http://localhost:3000
+ http://localhost:5173,http://localhost:4173,http://localhost:3000
```

**2. Agregado en `application-local.properties`**:
```properties
# CORS Configuration for React PWA frontend
cors.allowed-origins=http://localhost:5173,http://localhost:4173,http://localhost:3000
cors.allowed-methods=GET,POST,PUT,DELETE,PATCH,OPTIONS
cors.allowed-headers=*
cors.allow-credentials=true
cors.max-age=3600
```

**3. Agregado en `application-heroku.properties`**:
```properties
# CORS Configuration for React PWA frontend in production
cors.allowed-origins=${CORS_ALLOWED_ORIGINS:https://bunnycure.app,https://www.bunnycure.app}
```

---

## 🚀 Pasos para Probar (2 Opciones)

### Opción 1: Usar Backend Local (Recomendado para Dev)

**Terminal 1 - Backend:**
```powershell
cd C:\Users\alfre\IdeaProjects\bunnycure

# Compilar con cambios CORS
.\mvnw.cmd clean compile

# Iniciar backend local
$env:SPRING_PROFILES_ACTIVE="local"
$env:BUNNYCURE_ADMIN_USERNAME="admin"
$env:BUNNYCURE_ADMIN_PASSWORD="admin123"
.\mvnw.cmd spring-boot:run
```

Espera a que inicie en `http://localhost:8080`

**Terminal 2 - Frontend:**
```powershell
cd C:\Users\alfre\IdeaProjects\bunnycure-frontend

# Dev mode (usa .env.development → localhost:8080)
npm run dev
# Abrir http://localhost:5173

# O preview mode (también usa localhost:8080 en preview)
npm run build
npm run preview
# Abrir http://localhost:4173
```

✅ **Ahora debería funcionar sin errores de CORS**

---

### Opción 2: Configurar CORS en Heroku (Para Testing Remoto)

Si necesitas probar contra el backend de Heroku desde localhost:

**1. Configurar variable de entorno en Heroku:**

```bash
heroku config:set CORS_ALLOWED_ORIGINS="https://bunnycure.app,http://localhost:5173,http://localhost:4173" -a bunnycure
```

**2. Hacer deploy del backend actualizado:**

```powershell
cd C:\Users\alfre\IdeaProjects\bunnycure

# Si usas Git + Heroku
git add .
git commit -m "feat: Add CORS support for localhost:4173 (Vite preview)"
git push heroku main

# O el método que uses para deploy
```

**3. Verificar que se aplicó:**
```bash
heroku config:get CORS_ALLOWED_ORIGINS -a bunnycure
```

⚠️ **Nota**: Esto es solo para testing. En producción, solo deberías permitir el dominio real del frontend.

---

## 📋 Verificación

### Con Backend Local (Opción 1)

1. Backend corriendo en `http://localhost:8080`
2. Frontend en `http://localhost:5173` o `http://localhost:4173`
3. Abre DevTools > Console
4. No debe haber errores de CORS
5. Los datos de servicios/clientes deben cargar

### Con Heroku (Opción 2)

1. Verificar que la variable `CORS_ALLOWED_ORIGINS` está configurada
2. Frontend apuntando a Heroku (`.env.production`)
3. `npm run build && npm run preview`
4. Abrir `http://localhost:4173`
5. Verificar en Console que no hay errores de CORS

---

## 🔍 Troubleshooting

### El error persiste después de iniciar backend local

**Problema**: El frontend sigue apuntando a Heroku

**Solución**:
```powershell
# Verificar qué URL está usando
cd C:\Users\alfre\IdeaProjects\bunnycure-frontend
cat .env.development
# Debe mostrar: VITE_API_BASE_URL=http://localhost:8080

# Si usa otra, editar:
echo "VITE_API_BASE_URL=http://localhost:8080" > .env.development

# Reiniciar frontend
# Ctrl+C para detener
npm run dev
```

### Backend no inicia

**Problema**: No arranca el backend local

**Solución**:
```powershell
# Verificar que la BD H2 no está bloqueada
Remove-Item -Recurse -Force .\target\bunnycure-local.mv.db
Remove-Item -Recurse -Force .\target\bunnycure-local.trace.db

# Intentar de nuevo
.\mvnw.cmd spring-boot:run
```

### Frontend muestra página en blanco

**Problema**: Error 404 en todos los recursos

**Solución**:
```powershell
# Limpiar build y reinstalar
cd C:\Users\alfre\IdeaProjects\bunnycure-frontend
Remove-Item -Recurse -Force dist
npm run build
npm run preview
```

---

## 📝 Configuración por Ambiente

### Desarrollo (npm run dev)
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080` (desde `.env.development`)
- CORS: Permitido por `application-local.properties`

### Preview/Build (npm run preview)
- Frontend: `http://localhost:4173`
- Backend: `http://localhost:8080` (por defecto) o Heroku (si cambias .env)
- CORS: Permitido por cambios aplicados

### Producción (deployed)
- Frontend: `https://tu-dominio.com` (Vercel/Netlify)
- Backend: `https://bunnycure-b9a0d88cd51b.herokuapp.com`
- CORS: Configurar con `CORS_ALLOWED_ORIGINS` en Heroku

---

## ✅ Checklist

Antes de continuar con testing PWA:

- [ ] Backend local compila sin errores
- [ ] Backend local inicia correctamente
- [ ] Frontend dev mode (`npm run dev`) funciona sin CORS errors
- [ ] Frontend preview mode (`npm run preview`) funciona sin CORS errors
- [ ] API calls retornan datos correctamente
- [ ] No hay errores en Console de Chrome DevTools

---

## 🎯 Recomendación

**Para desarrollo y testing PWA, usa SIEMPRE backend local:**

✅ **Ventajas:**
- Sin problemas de CORS
- Más rápido (sin latencia de red)
- Puedes debuggear backend si hay problemas
- No afecta datos de producción
- Puedes ver logs del backend en tiempo real

❌ **Desventaja de usar Heroku en desarrollo:**
- CORS complejo de configurar
- Latencia de red
- Difícil debuggear
- Cambios en backend requieren deploy

---

**Usa Opción 1 (backend local) y listo!** 🚀

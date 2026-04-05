# 🔐 Implementación de Autenticación - Guía Completa

## ✅ Archivos Creados

### Backend
- `AuthApiController.java` - Endpoint `/api/auth/me` para obtener usuario actual
- `UserDto.java` - DTO para información de usuario
- `SecurityConfig.java` - Actualizado para permitir `/api/auth/**`

### Frontend
- `auth.api.ts` - Cliente API para login/logout/getCurrentUser
- `authStore.ts` - Store Zustand para estado de autenticación
- `useAuth.ts` - Hook personalizado para usar auth
- `LoginPage.tsx` - Página de login con formulario
- `ProtectedRoute.tsx` - HOC para proteger rutas
- `DashboardPage.tsx` - Dashboard inicial
- `AppRouter.tsx` - Configuración de rutas
- `App.tsx` - Actualizado con router

---

## 🚀 Pasos para Probar

### 1. Backend - Commit y Deploy

```powershell
cd C:\Users\alfre\IdeaProjects\bunnycure

# Agregar archivos nuevos
git add .
git commit -m "feat: agregar endpoint /api/auth/me para autenticación React"

# Deploy a Heroku
git push heroku main

# Esperar deploy (1-2 minutos)
# Verificar logs
heroku logs --tail -a TU-APP-NAME
```

### 2. Frontend - Probar Localmente

```powershell
cd C:\Users\alfre\IdeaProjects\bunnycure-frontend

# Asegurarse que .env.local apunta a localhost
# VITE_API_BASE_URL=http://localhost:8080

# Ejecutar dev server
npm run dev

# Abrir http://localhost:5173
# Debería redirigir a /login
```

### 3. Probar Login

**Usuario por defecto (debería existir en BD):**
- Username: `admin`
- Password: (la que configuraste en `BUNNYCURE_ADMIN_USERNAME` y `BUNNYCURE_ADMIN_PASSWORD`)

Si no tienes usuario, créalo desde backend:
```sql
-- Conectar a H2 console (http://localhost:8080/h2-console)
-- O usar Heroku pg:psql

INSERT INTO users (username, password, full_name, email, role, enabled) 
VALUES ('admin', '$2a$10$...', 'Administrador', 'admin@bunnycure.cl', 'ADMIN', true);
```

### 4. Flujo Esperado

1. **Abrir app:** http://localhost:5173
2. **Redirect automático:** → `/login`
3. **Ingresar credenciales:** admin / tu-password
4. **Submit:** POST a `/login` (Spring Security)
5. **Éxito:** Redirect a `/dashboard`
6. **Dashboard:** Muestra tarjetas con stats (vacías por ahora)

---

## 🔧 Arquitectura de Autenticación

### Backend (Spring Security)
```
1. POST /login (form data)
   ↓
2. Spring Security valida credenciales
   ↓
3. Crea sesión JSESSIONID (cookie)
   ↓
4. Redirect a /admin/dashboard
   ↓
5. Frontend hace GET /api/auth/me
   ↓
6. Backend retorna UserDto (JSON)
```

### Frontend (React + Zustand)
```
1. Usuario ingresa credenciales
   ↓
2. POST /login (URLSearchParams)
   ↓
3. Recibe cookie JSESSIONID
   ↓
4. GET /api/auth/me
   ↓
5. Guarda user en authStore
   ↓
6. Navigate a /dashboard
```

### Protección de Rutas
```
Usuario intenta acceder /dashboard
   ↓
ProtectedRoute verifica isAuthenticated
   ↓
SI: Renderiza DashboardPage
NO: Redirect a /login
```

---

## 🐛 Troubleshooting

### Error: "CORS policy"
**Causa:** Backend no permite origen de Vercel/localhost

**Solución:**
```powershell
# Verificar CORS en backend
heroku config -a TU-APP | findstr CORS

# Actualizar si falta
heroku config:set CORS_ALLOWED_ORIGINS="http://localhost:5173,http://localhost:4173,https://bunnycure-frontend.vercel.app" -a TU-APP
```

### Error: "401 Unauthorized" al hacer /api/auth/me
**Causa:** Cookie JSESSIONID no se está enviando

**Solución:**
- Verificar `withCredentials: true` en `apiClient`
- Verificar que backend y frontend estén en:
  - Mismo dominio (localhost:8080 y localhost:5173), o
  - Backend permite CORS con credentials

### Error: Login redirige a /login?error=true
**Causa:** Credenciales inválidas

**Solución:**
1. Verificar usuario existe en BD
2. Password está hasheado con BCrypt
3. Usuario está `enabled=true`

```sql
SELECT username, enabled FROM users;
```

### Error: "Cannot find module 'zustand/middleware'"
**Causa:** Falta dependencia

**Solución:**
```powershell
npm install zustand
# zustand ya incluye middleware, no necesita paquete adicional
```

---

## 📋 Checklist de Testing

### Local (Development)
- [ ] Backend corriendo en localhost:8080
- [ ] Frontend corriendo en localhost:5173
- [ ] /login carga correctamente
- [ ] Form login funciona
- [ ] Redirect a /dashboard tras login
- [ ] Dashboard muestra nombre de usuario
- [ ] /dashboard redirige a /login si no autenticado
- [ ] Refresh page mantiene sesión

### Producción (Vercel)
- [ ] Backend desplegado en Heroku
- [ ] Frontend desplegado en Vercel
- [ ] CORS configurado con dominio Vercel
- [ ] Login funciona desde Vercel
- [ ] Cookies JSESSIONID se envían correctamente
- [ ] HTTPS habilitado (automático en Vercel)

---

## 🎯 Siguientes Pasos

Una vez que login funcione:

### Fase 1: Layout (1 hora)
- [ ] Crear Navbar con logout
- [ ] Crear Sidebar con navegación
- [ ] Crear MainLayout wrapper

### Fase 2: CRUD Appointments (2-3 horas)
- [ ] AppointmentsPage (lista)
- [ ] AppointmentForm (crear/editar)
- [ ] AppointmentDetail (ver detalle)
- [ ] Filtros y búsqueda

### Fase 3: CRUD Customers (2 horas)
- [ ] CustomersPage
- [ ] CustomerForm
- [ ] CustomerDetail

---

## 📞 Comandos Útiles

```powershell
# BACKEND - Ver logs
heroku logs --tail -a TU-APP

# BACKEND - Restart
heroku ps:restart -a TU-APP

# BACKEND - Ver config
heroku config -a TU-APP

# FRONTEND - Dev server
npm run dev

# FRONTEND - Build
npm run build

# FRONTEND - Preview (con Service Worker)
npm run preview

# FRONTEND - Deploy Vercel
vercel --prod
```

---

## ✅ Estado Actual

- ✅ Backend: Endpoint `/api/auth/me` creado
- ✅ Backend: SecurityConfig actualizado
- ✅ Frontend: Auth API client
- ✅ Frontend: Auth store (Zustand)
- ✅ Frontend: LoginPage
- ✅ Frontend: ProtectedRoute
- ✅ Frontend: DashboardPage
- ✅ Frontend: AppRouter configurado
- ⏳ Backend: Pendiente commit y deploy
- ⏳ Frontend: Pendiente testing

---

**Próximo paso:** Deploy backend y probar login! 🚀

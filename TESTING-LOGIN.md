# 🧪 Testing de Autenticación - Paso a Paso

## 🎯 Estado Actual
✅ Frontend redirige a `/login`  
⏳ Backend con endpoint `/api/auth/me`  
⏳ Probar flujo completo de login

---

## 🔍 Paso 1: Verificar Backend

### 1.1 ¿Ya hiciste commit y push del backend?

```powershell
cd C:\Users\alfre\IdeaProjects\bunnycure

# Ver archivos nuevos
git status

# Si hay archivos nuevos, commit
git add .
git commit -m "feat: agregar endpoint /api/auth/me"

# Push a Heroku (o tu remote)
git push heroku main
# O si usas otro remote:
# git push origin main
```

**Espera 1-2 minutos para que el deploy complete.**

### 1.2 Verificar endpoint `/api/auth/me`

Abre el navegador o usa curl:

```powershell
# Debería dar 401 (no autenticado) - eso es correcto!
curl http://localhost:8080/api/auth/me
```

**Respuesta esperada:** `401 Unauthorized` (porque no hay sesión)

---

## 🔐 Paso 2: Crear Usuario de Prueba

### Opción A: Si tienes usuario admin

Intenta con las credenciales que configuraste en Heroku:
- Username: (el valor de `BUNNYCURE_ADMIN_USERNAME`)
- Password: (el valor de `BUNNYCURE_ADMIN_PASSWORD`)

### Opción B: Crear usuario manualmente

#### En Local (H2 Database):

1. Abrir H2 Console: http://localhost:8080/h2-console
   - JDBC URL: `jdbc:h2:mem:testdb`
   - Username: `sa`
   - Password: (vacío)

2. Ejecutar SQL:
```sql
-- Ver usuarios existentes
SELECT * FROM users;

-- Si no hay usuarios, crear uno
INSERT INTO users (username, password, full_name, email, role, enabled) 
VALUES (
  'admin',
  -- Password hasheado para "admin123" con BCrypt
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'Administrador',
  'admin@bunnycure.cl',
  'ADMIN',
  true
);
```

**Credenciales de prueba:**
- Username: `admin`
- Password: `admin123`

⚠️ **Importante:** El password debe estar hasheado con BCrypt. El hash de arriba es para `admin123`.

#### En Heroku (PostgreSQL):

```powershell
# Conectar a base de datos Heroku
heroku pg:psql -a TU-APP-NAME

# Ver usuarios
SELECT username, full_name, enabled FROM users;

# Crear usuario si no existe
INSERT INTO users (username, password, full_name, email, role, enabled) 
VALUES (
  'admin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'Administrador',
  'admin@bunnycure.cl',
  'ADMIN',
  true
);

-- Salir
\q
```

---

## 🧪 Paso 3: Probar Login

### 3.1 Frontend Local

1. **Abrir:** http://localhost:5173
2. **Debería redirigir a:** `/login`
3. **Ingresar credenciales:**
   - Usuario: `admin`
   - Password: `admin123` (o tu password)
4. **Click:** "Iniciar Sesión"

### 3.2 Resultados Esperados

**✅ Éxito:**
- Spinner "Iniciando sesión..."
- Redirect a `/dashboard`
- Dashboard muestra: "Bienvenido/a, Administrador"
- URL cambia a `/dashboard`

**❌ Error:**
- Alert rojo: "Error de autenticación - Credenciales inválidas"

---

## 🔍 Paso 4: Debugging (Si Falla)

### Error 1: CORS
```
Access to XMLHttpRequest at 'http://localhost:8080/login' 
has been blocked by CORS policy
```

**Solución:**
Verificar `application-local.properties`:
```properties
cors.allowed-origins=http://localhost:5173,http://localhost:4173
```

### Error 2: 401 Unauthorized
```
POST /login → 401
```

**Causas posibles:**
1. Usuario no existe en BD
2. Password incorrecto
3. Usuario con `enabled=false`

**Verificar:**
```sql
SELECT username, enabled FROM users WHERE username = 'admin';
```

### Error 3: Network Error
```
Network Error en console
```

**Causa:** Backend no está corriendo

**Solución:**
```powershell
cd C:\Users\alfre\IdeaProjects\bunnycure
mvn spring-boot:run
```

### Error 4: "Cannot read properties of null"
```
TypeError: Cannot read properties of null (reading 'username')
```

**Causa:** `/api/auth/me` no está retornando usuario

**Verificar:** DevTools > Network > `/api/auth/me`
- ¿Status 200?
- ¿Response tiene `data.username`?

---

## 📊 Paso 5: Verificar en DevTools

### Network Tab
1. F12 > Network
2. Login
3. Debería ver:
   ```
   POST /login → 302 (redirect) o 200
   GET /api/auth/me → 200
   ```

4. Response de `/api/auth/me`:
   ```json
   {
     "success": true,
     "data": {
       "id": 1,
       "username": "admin",
       "fullName": "Administrador",
       "email": "admin@bunnycure.cl",
       "role": "ADMIN",
       "enabled": true
     }
   }
   ```

### Application Tab
1. F12 > Application > Local Storage
2. Debería ver:
   ```
   auth-storage: {
     "user": {...},
     "isAuthenticated": true
   }
   ```

### Console Tab
- Sin errores rojos
- Puede haber warnings amarillos (ignorable)

---

## ✅ Checklist de Éxito

- [ ] Backend corriendo (localhost:8080)
- [ ] Frontend corriendo (localhost:5173)
- [ ] Usuario admin existe en BD
- [ ] Password correcto (admin123 o tu password)
- [ ] POST /login retorna 302 o 200
- [ ] GET /api/auth/me retorna 200 con usuario
- [ ] Dashboard carga con nombre de usuario
- [ ] Refresh page mantiene sesión
- [ ] /dashboard redirige a /login si hago logout

---

## 🚀 Paso 6: Testing Adicional

### Test de Rutas Protegidas
1. Estando en `/dashboard`, cerrar tab
2. Abrir nueva tab: http://localhost:5173/dashboard
3. **Debería:** Mantener sesión (si cookie sigue válida)

### Test de Logout (cuando lo implementemos)
```typescript
const { logout } = useAuth();
await logout();
// Debería redirigir a /login
```

---

## 📝 Próximos Pasos (Después de Login Exitoso)

1. **Agregar Navbar con Logout** (30 min)
2. **Agregar Sidebar con navegación** (30 min)
3. **Implementar CRUD Appointments** (2-3 horas)
4. **Deploy a producción** (30 min)

---

## 🆘 Si Algo Falla

**Copia y envíame:**

1. **Console errors:**
   F12 > Console > Screenshot de errores rojos

2. **Network requests:**
   F12 > Network > Click en `/login` > Screenshot de Headers y Response

3. **Backend logs:**
   ```powershell
   # Si usas mvn spring-boot:run
   # Copia últimas líneas de la consola
   ```

---

**¿Qué pasó cuando probaste el login?** 🔐

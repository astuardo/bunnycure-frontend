# 📱 GUÍA COMPLETA: Cómo Probar Notificaciones Push PWA

**Última actualización:** 7 de Abril, 2026  
**URL Producción:** https://bunnycure-frontend.vercel.app

---

## ⚡ **NUEVO: NOTIFICACIONES AUTOMÁTICAS**

El sistema ahora incluye **notificaciones automáticas** que se envían 2 horas antes de cada cita:

### **Cómo Funcionan:**
1. **Service Worker** revisa cada 5 minutos si hay citas próximas
2. Consulta endpoint `/api/appointments/upcoming-in-window?hours=2`
3. Si encuentra citas en las próximas 2 horas (sin `reminderSent=true`):
   - Muestra notificación push automáticamente
   - Marca la cita en cache para no volver a notificar
4. **Funciona incluso con app cerrada** (Android PWA instalada)

### **Requisitos:**
✅ App instalada como PWA (Android/Desktop)  
✅ Permisos de notificaciones otorgados  
✅ Service Worker activo  
✅ Usuario autenticado (token en localStorage)

---

## 🎯 OPCIONES DE PRUEBA

Tienes **3 formas** de probar las notificaciones push, dependiendo del dispositivo que uses:

1. **Chrome Desktop** - Para desarrollo rápido (limitado)
2. **Android Chrome** - Experiencia PWA completa ⭐ RECOMENDADO
3. **iOS Safari 16.4+** - Funcionalidad limitada

---

## 🖥️ OPCIÓN 1: CHROME DESKTOP (Desarrollo)

### **Ventajas:**
✅ Rápido para probar  
✅ DevTools completas para debugging  
✅ No requiere instalación  

### **Limitaciones:**
❌ Notificaciones solo con pestaña abierta  
❌ No es experiencia PWA real  
❌ No prueba funcionamiento offline  

### **Pasos:**

#### **1. Abrir la aplicación**
```
1. Abrir Chrome en desktop
2. Ir a https://bunnycure-frontend.vercel.app
3. Iniciar sesión con tus credenciales
```

#### **2. Ir a Settings**
```
1. Click en "⚙️ Settings" en el menú lateral
2. Scroll hasta la sección "📱 Notificaciones Push PWA"
3. Observar badge de estado (debe mostrar "default" o "denied")
```

#### **3. Solicitar permisos**
```
1. Click en botón "Solicitar Permisos"
2. Aparecerá popup del navegador:
   
   ┌─────────────────────────────────────┐
   │ bunnycure-frontend.vercel.app       │
   │ quiere enviarte notificaciones      │
   │                                     │
   │  [Bloquear]  [Permitir]            │
   └─────────────────────────────────────┘

3. Click "Permitir"
4. Badge cambiará a "granted" (verde)
```

#### **4. Enviar notificación de prueba**
```
1. Click en botón "Enviar Notificación de Prueba"
2. Esperar 1-2 segundos
3. Notificación aparecerá en esquina superior derecha:

   ┌─────────────────────────────────┐
   │ 🐰 BunnyCure                    │
   │ ¡Notificaciones activadas!      │
   │ Recibirás recordatorios...      │
   └─────────────────────────────────┘

4. ✅ Si aparece, funciona correctamente
```

#### **5. Debugging con DevTools**
```
1. F12 para abrir DevTools
2. Tab "Application"
3. Explorar:
   
   Service Workers →
   ✓ Verificar sw.js está "activated and running"
   ✓ Ver timestamp de instalación
   
   Cache Storage →
   ✓ Ver "bunnycure-cache-v1"
   ✓ Verificar archivos cacheados
   
   Manifest →
   ✓ Ver manifest.json
   ✓ Verificar gcm_sender_id presente

4. Tab "Console" para ver logs:
   SW registered: ServiceWorkerRegistration {...}
   Testing notification with service worker...
```

---

## 📱 OPCIÓN 2: ANDROID CHROME (PWA Completa) ⭐

### **Ventajas:**
✅ **Experiencia PWA real y completa**  
✅ **Notificaciones funcionan con app cerrada**  
✅ **Ícono en home screen como app nativa**  
✅ **Offline support completo**  
✅ Notificaciones del sistema Android  

### **Limitaciones:**
❌ Requiere Android 5.0+ (Lollipop)  
❌ Requiere Chrome actualizado  

### **Requisitos:**
- Android 5.0 o superior
- Chrome versión 58+
- Conexión a internet (solo primera vez)

---

### **PASO A PASO COMPLETO:**

#### **FASE 1: Instalar PWA**

**1.1 Abrir en Chrome**
```
1. Abrir Chrome en tu Android
2. Ir a: https://bunnycure-frontend.vercel.app
3. Esperar a que cargue completamente
```

**1.2 Agregar a Home Screen**
```
Método A (Automático - si aparece):
┌──────────────────────────────────┐
│ Agregar BunnyCure a inicio       │
│ [Cancelar] [Agregar]            │
└──────────────────────────────────┘

Método B (Manual):
1. Tap en menú Chrome (⋮) arriba-derecha
2. Buscar opción "Agregar a pantalla de inicio"
   o "Instalar aplicación"
3. Aparecerá diálogo:
   
   ┌────────────────────────────────┐
   │ Agregar a inicio               │
   │                                │
   │ [🐰] BunnyCure                 │
   │                                │
   │ [Cancelar] [Agregar]          │
   └────────────────────────────────┘

4. Tap "Agregar"
5. Confirmar en siguiente diálogo si aparece
```

**1.3 Verificar instalación**
```
1. Salir de Chrome (cerrar app)
2. Ir a home screen de Android
3. Buscar ícono "BunnyCure" 🐰
4. ✅ Si está ahí, PWA instalada correctamente
```

---

#### **FASE 2: Configurar Notificaciones**

**2.1 Abrir app instalada**
```
⚠️ IMPORTANTE: Abrir desde home screen, NO desde Chrome

1. Tap en ícono BunnyCure del home screen
2. App abrirá en modo fullscreen (sin barra Chrome)
3. Login con tus credenciales
```

**2.2 Ir a Settings**
```
1. Tap menú hamburguesa (☰) arriba-izquierda
2. Tap "⚙️ Settings"
3. Scroll hasta "📱 Notificaciones Push PWA"
```

**2.3 Solicitar permisos Android**
```
1. Tap botón "Solicitar Permisos"
2. Aparecerá diálogo del SISTEMA Android:

   ┌────────────────────────────────────────┐
   │ ¿Permitir que BunnyCure envíe         │
   │ notificaciones?                        │
   │                                        │
   │ [Bloquear] [Permitir]                 │
   └────────────────────────────────────────┘

3. Tap "Permitir"
4. Badge en app cambiará a "granted" (verde)
```

**2.4 Enviar prueba inicial**
```
1. Tap "Enviar Notificación de Prueba"
2. Notificación aparecerá en notification drawer:

   ╔════════════════════════════════════╗
   ║ 🐰 BunnyCure         ahora        ║
   ║ ¡Notificaciones activadas!        ║
   ║ Recibirás recordatorios de tus... ║
   ╚════════════════════════════════════╝

3. ✅ Notificación debe aparecer
```

---

#### **FASE 3: Probar con App Cerrada** 🔥

**3.1 Cerrar completamente la app**
```
Método A (Recientes):
1. Botón "Recientes" de Android (⬜)
2. Swipe BunnyCure hacia arriba/lado
3. App desaparece de recientes

Método B (Configuración):
1. Android Settings → Apps
2. Buscar "BunnyCure"
3. Tap "Forzar detención"
```

**3.2 Enviar notificación remota**
```
Opción A (Usar otro dispositivo):
1. Abrir app en desktop/otro móvil
2. Login con misma cuenta
3. Settings → "Enviar Notificación de Prueba"
4. ✅ Debe aparecer en tu Android CERRADO

Opción B (Temporizador):
1. Antes de cerrar, configurar auto-test (si existe)
2. Cerrar app
3. Esperar notificación automática
```

**3.3 Verificar notificación llegó**
```
1. Con app CERRADA, aparecerá:
   - Sonido/vibración de notificación
   - Banner en parte superior
   - Entrada en notification drawer

2. Deslizar desde arriba para ver:
   ╔════════════════════════════════════╗
   ║ 🐰 BunnyCure         hace 1 min   ║
   ║ ¡Notificaciones activadas!        ║
   ║ Recibirás recordatorios de tus... ║
   ╚════════════════════════════════════╝

3. Tap en notificación → App se abre

✅ ÉXITO: Si recibiste notificación con app cerrada,
          PWA funciona correctamente!
```

---

#### **FASE 4: Verificar Service Worker**

**4.1 Inspeccionar desde Chrome Desktop**
```
1. En Chrome desktop, ir a:
   chrome://inspect/#service-workers

2. Buscar "https://bunnycure-frontend.vercel.app"

3. Ver detalles:
   Status: ACTIVATED
   Running: Yes
   Clients: (número de tabs/instancias)
   
4. Click "inspect" para ver console del SW
```

**4.2 Test desde DevTools móvil**
```
Si tienes USB Debugging:

1. Conectar Android a PC con USB
2. Habilitar USB Debugging en Android
3. Chrome desktop → chrome://inspect
4. Ver dispositivos conectados
5. Click "inspect" en BunnyCure
6. DevTools móvil → Tab Application → Service Workers
```

---

## 🍎 OPCIÓN 3: iOS SAFARI 16.4+ (Limitado)

### **Ventajas:**
✅ Funciona en iPhone/iPad  
✅ Notificaciones nativas iOS  

### **Limitaciones:**
❌ Requiere iOS 16.4 o superior  
❌ **Solo funciona con app ABIERTA** (por ahora)  
❌ Notificaciones background limitadas  
❌ Proceso instalación más complejo  

### **Requisitos:**
- iOS 16.4+ o iPadOS 16.4+
- Safari actualizado
- App debe instalarse como PWA

---

### **PASO A PASO iOS:**

#### **1. Verificar versión iOS**
```
1. Settings → General → About
2. Buscar "Software Version"
3. Debe ser ≥ 16.4

Si es menor:
Settings → General → Software Update
```

#### **2. Abrir en Safari**
```
⚠️ DEBE ser Safari, NO Chrome iOS

1. Abrir Safari
2. Ir a https://bunnycure-frontend.vercel.app
3. Esperar carga completa
```

#### **3. Agregar a Home Screen**
```
1. Tap botón "Compartir" (cuadrado con flecha ↑)
2. Scroll en opciones hasta encontrar:
   "Agregar a Inicio" o "Add to Home Screen"
   
   ┌─────────────────────────────┐
   │ Agregar a Inicio            │
   └─────────────────────────────┘

3. Tap la opción
4. Personalizar nombre si quieres:
   
   ┌─────────────────────────────┐
   │ BunnyCure                   │
   │ https://bunnycure-...       │
   │                             │
   │ [Cancelar]  [Agregar]      │
   └─────────────────────────────┘

5. Tap "Agregar"
6. Cerrar Safari
```

#### **4. Abrir PWA instalada**
```
⚠️ CRÍTICO: Abrir desde HOME SCREEN, no Safari

1. Ir a home screen
2. Buscar ícono BunnyCure 🐰
3. Tap para abrir
4. App abre en modo standalone (sin barras Safari)
5. Login con credenciales
```

#### **5. Solicitar permisos**
```
1. Menú → Settings
2. Scroll a "Notificaciones Push PWA"
3. Tap "Solicitar Permisos"
4. Diálogo iOS:

   ┌────────────────────────────────────┐
   │ "BunnyCure" Would Like to Send    │
   │ You Notifications                  │
   │                                    │
   │ [Don't Allow]  [Allow]            │
   └────────────────────────────────────┘

5. Tap "Allow"
```

#### **6. Enviar prueba**
```
⚠️ MANTENER APP ABIERTA

1. Tap "Enviar Notificación de Prueba"
2. Notificación aparece arriba:

   ┌────────────────────────────────┐
   │ 🐰 BunnyCure      now         │
   │ ¡Notificaciones activadas!    │
   └────────────────────────────────┘

3. ✅ Si aparece, funciona
```

#### **7. Limitaciones iOS**
```
❌ Cerrar app → Notificaciones NO llegarán (por ahora)
❌ Solo funciona con app en foreground
❌ No hay service worker background en iOS (aún)

Workaround:
- Dejar app abierta en background
- O usar app frecuentemente
```

---

## 🔧 TROUBLESHOOTING

### **Problema 1: Botón "Solicitar Permisos" no hace nada**

**Causa:** Permisos ya otorgados o denegados previamente

**Solución:**
```
Chrome Desktop:
1. Click candado 🔒 en barra URL
2. Permisos → Notificaciones → Permitir
3. Recargar página

Android:
1. Mantener tap en ícono app
2. Info de app → Permisos → Notificaciones → Permitir
3. Reabrir app

iOS:
1. Settings → BunnyCure → Notificaciones → ON
2. Reabrir app
```

---

### **Problema 2: "Service Worker no registrado"**

**Síntoma:** Console muestra error de SW

**Solución:**
```
1. Verificar HTTPS (Vercel usa HTTPS por defecto)
2. Verificar archivo sw.js existe: /sw.js
3. Console → verificar errores de carga
4. Hard refresh: Ctrl+Shift+R (desktop) / Borrar cache (móvil)
```

---

### **Problema 3: Notificación no aparece en Android cerrado**

**Checklist:**
```
✓ App instalada como PWA (no solo bookmark)
✓ Permisos Android concedidos (Settings → Apps → BunnyCure)
✓ Notificaciones no bloqueadas en ajustes Android
✓ Modo No Molestar desactivado
✓ Service Worker registrado (verificar en chrome://inspect)
```

**Solución:**
```
1. Desinstalar PWA (mantener tap → Desinstalar)
2. Borrar cache de Chrome
3. Reinstalar PWA desde cero
4. Volver a solicitar permisos
```

---

### **Problema 4: iOS no muestra opción "Agregar a Inicio"**

**Causas:**
```
❌ Navegador no es Safari (Chrome iOS no permite PWA)
❌ Ya está agregada (revisar home screen)
❌ iOS < 16.4 (actualizar sistema)
```

**Solución:**
```
1. Asegurar uso de Safari
2. Verificar versión iOS
3. Si ya existe, desinstalar y reinstalar
```

---

### **Problema 5: Badge no cambia de "default" a "granted"**

**Causa:** Estado no se actualiza en UI

**Solución:**
```javascript
// Ejecutar en Console:
console.log('Actual permission:', Notification.permission)

// Si es "granted" pero UI no actualiza:
1. Recargar página
2. Verificar useNotificationPermission hook
3. Check setInterval en useEffect del hook
```

---

## 🧪 **CÓMO PROBAR NOTIFICACIONES AUTOMÁTICAS**

### **Test Rápido (Desktop - 10 minutos):**

```bash
# 1. Instalar PWA
1. Abrir https://bunnycure-frontend.vercel.app en Chrome
2. Click en ícono de instalación (barra URL)
3. "Instalar"

# 2. Configurar permisos
1. Abrir app instalada
2. Login con credenciales
3. Settings → Solicitar Permisos → Permitir

# 3. Crear cita de prueba en 2 horas
1. Ir a Calendar
2. Crear nueva cita para HOY, 2 horas desde ahora
3. Customer: cualquiera
4. Service: cualquiera
5. Status: CONFIRMED
6. Guardar

# 4. Esperar notificación automática
1. Dejar app abierta en background
2. Esperar máximo 5 minutos (próximo chequeo del SW)
3. ✅ Debe aparecer notificación automáticamente

# 5. Ver en DevTools
1. F12 → Application → Service Workers
2. Ver logs: "[SW-AUTO] Encontradas X citas en ventana de 2h"
3. Console: "[SW-AUTO] Mostrando notificación para cita X"
```

### **Test Completo (Android PWA - 15 minutos):**

```bash
# 1. Instalar PWA
1. Chrome Android → URL
2. Menú → "Agregar a pantalla de inicio"

# 2. Configurar permisos
1. Abrir desde home screen
2. Login
3. Settings → Solicitar Permisos → Permitir

# 3. Crear cita de prueba
1. Crear cita CONFIRMADA en 2 horas

# 4. CERRAR app completamente
1. Recientes → Swipe up para cerrar BunnyCure

# 5. Esperar notificación (hasta 5 min)
1. No tocar el celular
2. Service Worker ejecutará chequeo automático
3. ✅ Notificación debe aparecer CON APP CERRADA

# 6. Tap en notificación
1. Debe abrir la app en /calendar
```

### **Verificar en Logs (DevTools Remote):**

```bash
# Desktop Chrome con USB Debugging
1. Conectar Android con USB
2. chrome://inspect
3. Buscar BunnyCure
4. Click "inspect"
5. Console → filtrar por "[SW-AUTO]"
6. Ver:
   "[SW-AUTO] Verificando citas próximas..."
   "[SW-AUTO] Encontradas 1 citas en ventana de 2h"
   "[SW-AUTO] Cita 123 en 1.8 horas"
   "[SW-AUTO] Mostrando notificación para cita 123"
```

---

## 🔍 **DEBUGGING NOTIFICACIONES AUTOMÁTICAS**

### **No aparecen notificaciones automáticas:**

```bash
1. Verificar Service Worker activo:
   F12 → Application → Service Workers
   Debe mostrar "activated and running"

2. Verificar token disponible:
   Console: localStorage.getItem('token')
   Debe retornar token JWT

3. Ver logs del chequeo:
   Console → filtrar "[SW-AUTO]"
   Debe ejecutar cada 5 minutos

4. Verificar cita existe:
   API: GET /api/appointments/upcoming-in-window?hours=2
   Debe retornar array con la cita

5. Permisos otorgados:
   Notification.permission === "granted"
```

### **Notificación aparece múltiples veces:**

```bash
Causa: Cache de citas notificadas no está funcionando

Solución:
1. F12 → Application → Cache Storage
2. Buscar "bunnycure-data"
3. Ver entry "/data/notified_appointments"
4. Si no existe, el SW está guardando correctamente

5. Clear cache y recargar
```

### **Backend no responde:**

```bash
1. Verificar Railway deployment:
   https://bunnycure-production.up.railway.app/actuator/health

2. Test endpoint manual:
   curl https://bunnycure-production.up.railway.app/api/appointments/upcoming-in-window?hours=2 \
     -H "Authorization: Bearer YOUR_TOKEN"

3. Revisar CORS:
   Debe permitir vercel.app origin
```

---

## 📊 **CÓMO FUNCIONA INTERNAMENTE**

### **Flujo de Notificaciones Automáticas:**

```
1. Service Worker activado
   ↓
2. startPeriodicCheck() ejecuta cada 5 min
   ↓
3. getAuthToken() obtiene token desde cliente
   ↓
4. fetch(/api/appointments/upcoming-in-window?hours=2)
   ↓
5. Para cada cita:
   - Verificar si ya notificada (cache)
   - Calcular tiempo restante
   - Si ≤ 2h y > 0: mostrar notificación
   - Marcar como notificada en cache
   ↓
6. Notificación aparece en sistema
```

### **Componentes Clave:**

```javascript
// public/sw.js
const CHECK_INTERVAL = 5 * 60 * 1000;  // 5 minutos
const NOTIFICATION_WINDOW_HOURS = 2;

// Funciones principales:
- startPeriodicCheck() → Inicia loop
- checkUpcomingAppointments() → Consulta API
- processAppointment() → Decide si notificar
- showAppointmentNotification() → Muestra notificación
- getAuthToken() → Obtiene token vía postMessage
- markAsNotified() → Cache en IndexedDB

// src/main.tsx
- Listener para REQUEST_AUTH_TOKEN
- Responde con token desde localStorage
```

### **Cache de Citas Notificadas:**

```javascript
// Estructura:
bunnycure-data/
  /data/notified_appointments → [123, 456, 789]

// Lógica:
1. Antes de notificar, verificar si ID está en array
2. Si está: skip (ya notificada)
3. Si no está: notificar y agregar a array
4. Array persiste en Cache API (no se pierde al recargar)
```

---

## ⚙️ **CONFIGURACIÓN AVANZADA**

### **Cambiar intervalo de chequeo:**

```javascript
// public/sw.js línea 8
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 min

// Cambiar a cada 2 minutos:
const CHECK_INTERVAL = 2 * 60 * 1000; // 2 min

// ⚠️ Balance entre batería y precisión
```

### **Cambiar ventana de notificación:**

```javascript
// public/sw.js línea 9
const NOTIFICATION_WINDOW_HOURS = 2; // 2 horas antes

// Notificar 1 hora antes:
const NOTIFICATION_WINDOW_HOURS = 1;

// Notificar 30 min antes:
const NOTIFICATION_WINDOW_HOURS = 0.5;
```

### **Personalizar notificación:**

```javascript
// public/sw.js función showAppointmentNotification()

const title = '🔔 Recordatorio de Cita';
const body = `${customerName} tiene ${serviceName}...`;

// Opciones adicionales:
{
  requireInteraction: true,  // No desaparece automáticamente
  tag: `appointment-${id}`,  // Evita duplicados
  renotify: false,           // No re-notificar mismo tag
  silent: false,             // Con sonido
  vibrate: [200, 100, 200],  // Patrón de vibración (Android)
}
```

---

## 🎯 RECOMENDACIÓN FINAL

**Para testing completo y producción:**
👉 **Usar Android Chrome con PWA instalada**

**Razones:**
1. ✅ Soporte completo de Service Workers
2. ✅ Notificaciones background funcionan
3. ✅ Experiencia idéntica a app nativa
4. ✅ Mayor base de usuarios (vs iOS)
5. ✅ Menos limitaciones técnicas

**Para desarrollo rápido:**
👉 **Chrome Desktop con DevTools**

**Para usuarios iOS:**
👉 **Esperar mejoras de Apple en iOS 17+**
(o usar notificaciones solo con app abierta)

---

## 📞 SOPORTE

Si encuentras problemas:

1. Revisar Console (F12) para errores
2. Verificar Network tab para requests fallidos
3. Inspeccionar Service Worker en Application tab
4. Confirmar permisos en settings del navegador/OS
5. Probar en modo incógnito (descarta cache corrupto)

---

**¡Listo para probar!** 🚀

Recuerda: **Las notificaciones automáticas funcionan mejor en Android Chrome con PWA instalada, pero también funcionan en desktop Chrome.**

**Próxima mejora:** Backend Web Push real (no depende de app abierta)

### **Checklist Completo:**

```
Desktop Chrome:
✅ [ ] Service Worker registrado
✅ [ ] Permisos solicitados y concedidos
✅ [ ] Badge muestra "granted"
✅ [ ] Notificación test aparece
✅ [ ] Console sin errores
✅ [ ] Cache poblado (Application → Cache Storage)

Android PWA:
✅ [ ] PWA instalada en home screen
✅ [ ] App abre sin barra Chrome
✅ [ ] Permisos Android concedidos
✅ [ ] Notificación test aparece
✅ [ ] Notificación llega con app CERRADA ⭐
✅ [ ] Tap en notificación abre app
✅ [ ] Service Worker activo (chrome://inspect)

iOS Safari 16.4+:
✅ [ ] iOS versión ≥ 16.4
✅ [ ] PWA instalada desde Safari
✅ [ ] App abre en modo standalone
✅ [ ] Permisos iOS concedidos
✅ [ ] Notificación test aparece (app abierta)
⚠️ [ ] Limitación conocida: no funciona con app cerrada
```

---

## 🎯 RECOMENDACIÓN FINAL

**Para testing completo y producción:**
👉 **Usar Android Chrome con PWA instalada**

**Razones:**
1. ✅ Soporte completo de Service Workers
2. ✅ Notificaciones background funcionan
3. ✅ Experiencia idéntica a app nativa
4. ✅ Mayor base de usuarios (vs iOS)
5. ✅ Menos limitaciones técnicas

**Para desarrollo rápido:**
👉 **Chrome Desktop con DevTools**

**Para usuarios iOS:**
👉 **Esperar mejoras de Apple en iOS 17+**
(o usar notificaciones solo con app abierta)

---

## 📞 SOPORTE

Si encuentras problemas:

1. Revisar Console (F12) para errores
2. Verificar Network tab para requests fallidos
3. Inspeccionar Service Worker en Application tab
4. Confirmar permisos en settings del navegador/OS
5. Probar en modo incógnito (descarta cache corrupto)

---

**¡Listo para probar!** 🚀

Recuerda: **La mejor experiencia es en Android Chrome con PWA instalada.**

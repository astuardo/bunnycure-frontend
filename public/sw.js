/**
 * Service Worker para notificaciones PWA y cache offline
 * Maneja notificaciones en segundo plano y cache de recursos
 * Incluye chequeo automático de citas próximas para notificaciones
 */

const CACHE_NAME = 'bunnycure-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
];

const API_BASE_URL = 'https://bunnycure-production.up.railway.app';
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutos
const NOTIFICATION_WINDOW_HOURS = 2; // Notificar 2 horas antes
const NOTIFIED_APPOINTMENTS_KEY = 'notified_appointments';

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache abierto, agregando recursos...');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[SW] Error al cachear recursos:', error);
      })
  );
  // Activar inmediatamente sin esperar
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Iniciar chequeo periódico de citas próximas
  startPeriodicCheck();
  
  // Tomar control inmediatamente
  return self.clients.claim();
});

// Estrategia de cache: Network First, fallback a Cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clonar la respuesta para guardar en cache
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // Si falla el fetch, intentar servir desde cache
        return caches.match(event.request).then((response) => {
          return response || new Response('Offline - Recurso no disponible');
        });
      })
  );
});

// Manejo de notificaciones push
self.addEventListener('push', (event) => {
  console.log('[SW] Push recibido:', event);
  
  let notificationData = {
    title: 'BunnyCure',
    body: 'Nueva notificación',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        data: data.data || {},
      };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: [200, 100, 200],
      requireInteraction: false,
      data: notificationData.data,
      actions: [
        {
          action: 'open',
          title: 'Abrir'
        },
        {
          action: 'close',
          title: 'Cerrar'
        }
      ]
    })
  );
});

// Manejo de clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Click en notificación:', event);
  
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(self.registration.scope)
    );
  }
});

// Manejo de cierre de notificaciones
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificación cerrada:', event);
});

// ========== FUNCIONES DE CHEQUEO AUTOMÁTICO DE CITAS ==========

/**
 * Inicia el chequeo periódico de citas próximas
 */
function startPeriodicCheck() {
  console.log('[SW-AUTO] Iniciando chequeo periódico de citas (cada 5 min)');
  
  // Ejecutar inmediatamente
  checkUpcomingAppointments();
  
  // Luego cada 5 minutos
  setInterval(() => {
    checkUpcomingAppointments();
  }, CHECK_INTERVAL);
}

/**
 * Chequea si hay citas próximas y muestra notificación si corresponde
 */
async function checkUpcomingAppointments() {
  try {
    console.log('[SW-AUTO] Verificando citas próximas...');
    
    // Obtener token de autenticación desde el cliente
    const token = await getAuthToken();
    if (!token) {
      console.log('[SW-AUTO] No hay usuario autenticado, omitiendo chequeo');
      return;
    }
    
    // Consultar API
    const response = await fetch(
      `${API_BASE_URL}/api/appointments/upcoming-in-window?hours=${NOTIFICATION_WINDOW_HOURS}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      console.error('[SW-AUTO] Error al obtener citas:', response.status);
      return;
    }
    
    const result = await response.json();
    const appointments = result.data || [];
    
    console.log(`[SW-AUTO] Encontradas ${appointments.length} citas en ventana de 2h`);
    
    // Procesar cada cita
    for (const appointment of appointments) {
      await processAppointment(appointment);
    }
    
  } catch (error) {
    console.error('[SW-AUTO] Error en chequeo automático:', error);
  }
}

/**
 * Procesa una cita y decide si mostrar notificación
 */
async function processAppointment(appointment) {
  const appointmentId = appointment.id;
  
  // Verificar si ya notificamos esta cita
  const notifiedIds = await getNotifiedAppointments();
  if (notifiedIds.includes(appointmentId)) {
    console.log(`[SW-AUTO] Cita ${appointmentId} ya fue notificada anteriormente`);
    return;
  }
  
  // Calcular tiempo restante
  const appointmentDateTime = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`);
  const now = new Date();
  const hoursUntil = (appointmentDateTime - now) / (1000 * 60 * 60);
  
  console.log(`[SW-AUTO] Cita ${appointmentId} en ${hoursUntil.toFixed(1)} horas`);
  
  // Si está dentro de la ventana de 2 horas, notificar
  if (hoursUntil <= NOTIFICATION_WINDOW_HOURS && hoursUntil > 0) {
    await showAppointmentNotification(appointment, hoursUntil);
    await markAsNotified(appointmentId);
  }
}

/**
 * Muestra notificación de recordatorio de cita
 */
async function showAppointmentNotification(appointment, hoursUntil) {
  const customerName = `${appointment.customer.firstName} ${appointment.customer.lastName}`;
  const serviceName = appointment.service.name;
  const timeStr = appointment.appointmentTime;
  
  const title = '🔔 Recordatorio de Cita';
  const body = `${customerName} tiene ${serviceName} a las ${timeStr} (en ${Math.round(hoursUntil * 60)} minutos)`;
  
  console.log(`[SW-AUTO] Mostrando notificación para cita ${appointment.id}`);
  
  await self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: `appointment-${appointment.id}`,
    requireInteraction: true,
    data: {
      appointmentId: appointment.id,
      url: '/calendar',
    },
  });
}

/**
 * Obtiene el token de autenticación desde los clientes conectados
 */
let cachedToken = null;

// Listener para recibir respuestas de los clientes
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'AUTH_TOKEN_RESPONSE') {
    cachedToken = event.data.token;
    console.log('[SW-AUTO] Token recibido desde cliente');
  }
});

async function getAuthToken() {
  try {
    // Si ya tenemos el token en cache, usarlo
    if (cachedToken) {
      return cachedToken;
    }
    
    // Pedir token a todos los clientes
    const allClients = await clients.matchAll({ includeUncontrolled: true, type: 'window' });
    
    if (allClients.length === 0) {
      console.log('[SW-AUTO] No hay clientes conectados');
      return null;
    }
    
    // Enviar solicitud a todos los clientes
    allClients.forEach((client) => {
      client.postMessage({ type: 'REQUEST_AUTH_TOKEN' });
    });
    
    // Esperar un momento para recibir respuesta
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return cachedToken;
    
  } catch (error) {
    console.error('[SW-AUTO] Error obteniendo token:', error);
    return null;
  }
}

/**
 * Obtiene lista de IDs de citas ya notificadas
 */
async function getNotifiedAppointments() {
  try {
    const stored = await getFromIndexedDB(NOTIFIED_APPOINTMENTS_KEY);
    return stored || [];
  } catch (error) {
    console.error('[SW-AUTO] Error leyendo notificaciones:', error);
    return [];
  }
}

/**
 * Marca una cita como notificada
 */
async function markAsNotified(appointmentId) {
  try {
    const notifiedIds = await getNotifiedAppointments();
    if (!notifiedIds.includes(appointmentId)) {
      notifiedIds.push(appointmentId);
      await saveToIndexedDB(NOTIFIED_APPOINTMENTS_KEY, notifiedIds);
      console.log(`[SW-AUTO] Cita ${appointmentId} marcada como notificada`);
    }
  } catch (error) {
    console.error('[SW-AUTO] Error marcando cita:', error);
  }
}

/**
 * Helpers para IndexedDB (storage persistente)
 */
async function getFromIndexedDB(key) {
  // Por ahora usar Cache API como alternativa simple
  const cache = await caches.open('bunnycure-data');
  const response = await cache.match(`/data/${key}`);
  if (response) {
    return await response.json();
  }
  return null;
}

async function saveToIndexedDB(key, value) {
  const cache = await caches.open('bunnycure-data');
  const response = new Response(JSON.stringify(value));
  await cache.put(`/data/${key}`, response);
}

console.log('[SW] Service Worker cargado correctamente');

/**
 * Service Worker para notificaciones PWA y cache offline
 * Maneja notificaciones en segundo plano y cache de recursos
 * Incluye chequeo automÃ¡tico de citas prÃ³ximas para notificaciones
 */

const CACHE_NAME = 'bunnycure-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
];

const API_BASE_URL = 'https://bunnycure-04c4c179be8f.herokuapp.com';
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutos
const NOTIFICATION_WINDOW_HOURS = 2; // Notificar 2 horas antes
const NOTIFIED_APPOINTMENTS_KEY = 'notified_appointments';
const AUTH_TOKEN_CACHE_KEY = 'auth_token';
const TEMPLATES_CACHE_KEY = 'notification_templates';
const TEMPLATES_CACHE_TTL = 30 * 60 * 1000; // 30 minutos

// Templates por defecto (fallback)
const DEFAULT_TEMPLATES = {
  defaultTitle: 'Recordatorio de Agenda',
  defaultBody: 'Hola {customerName}, tienes una cita de {serviceName} el {date} a las {time}.',
  twoHourTitle: '¡Tu cita es pronto!',
  twoHourBody: 'Hola {customerName}, tu cita de {serviceName} es en {minutesUntil} minutos ({time}). ¡Te esperamos!',
};

// InstalaciÃ³n del Service Worker
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

// ActivaciÃ³n del Service Worker
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
    }).then(() => {
      // Tomar control inmediatamente
      return self.clients.claim();
    }).then(() => {
      // Iniciar chequeo periÃ³dico de citas prÃ³ximas DESPUÃ‰S de tomar control
      console.log('[SW] ðŸš€ Iniciando chequeo periÃ³dico de notificaciones...');
      startPeriodicCheck();
    })
  );
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
    title: 'Recordatorio de Agenda',
    body: 'Nueva notificaciÃ³n',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: sanitizePushTitle(data.title) || notificationData.title,
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

function sanitizePushTitle(title) {
  if (!title || typeof title !== 'string') {
    return 'Recordatorio de Agenda';
  }
  const normalizedTitle = title.replace(/\s+from\s+BunnyCure$/i, '').trim();
  if (/^recordatorio de agenda$/i.test(normalizedTitle)) {
    return 'Recordatorio de Agenda';
  }
  return normalizedTitle;
}

// Manejo de clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Click en notificaciÃ³n:', event);
  
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(self.registration.scope)
    );
  }
});

// Manejo de cierre de notificaciones
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] NotificaciÃ³n cerrada:', event);
});

// ========== FUNCIONES DE CHEQUEO AUTOMÃTICO DE CITAS ==========

/**
 * Inicia el chequeo periÃ³dico de citas prÃ³ximas
 */
function startPeriodicCheck() {
  console.log('[SW-AUTO] â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—');
  console.log('[SW-AUTO] â•‘  Iniciando chequeo periÃ³dico de citas     â•‘');
  console.log('[SW-AUTO] â•‘  Intervalo: cada 5 minutos                 â•‘');
  console.log('[SW-AUTO] â•‘  Ventana: 2 horas antes de la cita         â•‘');
  console.log('[SW-AUTO] â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  
  // Ejecutar inmediatamente
  console.log('[SW-AUTO] â° Ejecutando primer chequeo inmediato...');
  checkUpcomingAppointments();
  
  // Luego cada 5 minutos
  const intervalId = setInterval(() => {
    console.log('[SW-AUTO] â° Ejecutando chequeo programado (5 min)...');
    checkUpcomingAppointments();
  }, CHECK_INTERVAL);
  
  console.log(`[SW-AUTO] âœ… Interval ID: ${intervalId} - Service Worker activo`);
}

/**
 * Chequea si hay citas prÃ³ximas y muestra notificaciÃ³n si corresponde
 */
async function checkUpcomingAppointments() {
  const now = new Date().toISOString();
  console.log(`[SW-AUTO] â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—`);
  console.log(`[SW-AUTO] â•‘  ðŸ” CHEQUEO AUTOMÃTICO DE CITAS           â•‘`);
  console.log(`[SW-AUTO] â•‘  ${now}                  â•‘`);
  console.log(`[SW-AUTO] â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•`);
  
  try {
    const token = await getAuthToken();
    
    if (!token) {
      console.warn('[SW-AUTO] âŒ NO HAY TOKEN - Usuario no autenticado');
      console.warn('[SW-AUTO] ðŸ’¡ SoluciÃ³n: Abrir app y hacer login');
      return;
    }
    
    console.log('[SW-AUTO] âœ… Token obtenido, haciendo request...');
    
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
      console.error(`[SW-AUTO] âŒ Error en request: ${response.status} ${response.statusText}`);
      return;
    }
    
    const result = await response.json();
    const appointments = result.data || [];
    
    console.log(`[SW-AUTO] ðŸ“Š Respuesta del servidor:`);
    console.log(`[SW-AUTO]    â€¢ Citas en ventana de ${NOTIFICATION_WINDOW_HOURS}h: ${appointments.length}`);
    
    if (appointments.length === 0) {
      console.log('[SW-AUTO] âœ… No hay citas prÃ³ximas en las prÃ³ximas 2 horas');
      return;
    }
    
    console.log(`[SW-AUTO] ðŸ”” Procesando ${appointments.length} cita(s)...`);
    
    // Procesar cada cita
    for (const appointment of appointments) {
      await processAppointment(appointment);
    }
    
    console.log('[SW-AUTO] âœ… Chequeo completado exitosamente');
    
  } catch (error) {
    console.error('[SW-AUTO] âŒ ERROR CRÃTICO en chequeo automÃ¡tico:');
    console.error('[SW-AUTO]', error);
  }
}

/**
 * Procesa una cita y decide si mostrar notificaciÃ³n
 */
async function processAppointment(appointment) {
  const appointmentId = appointment.id;
  const customerName = resolveCustomerName(appointment);
  const serviceName = resolveServiceName(appointment);
  
  console.log(`[SW-AUTO] â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”`);
  console.log(`[SW-AUTO] ðŸ“… Procesando cita ID: ${appointmentId}`);
  console.log(`[SW-AUTO]    Cliente: ${customerName}`);
  console.log(`[SW-AUTO]    Servicio: ${serviceName}`);
  console.log(`[SW-AUTO]    Fecha/Hora: ${appointment.appointmentDate} ${appointment.appointmentTime}`);
  
  // Verificar si ya notificamos esta cita
  const notifiedIds = await getNotifiedAppointments();
  if (notifiedIds.includes(appointmentId)) {
    console.log(`[SW-AUTO] â­ï¸  Cita ${appointmentId} ya fue notificada (skip)`);
    return;
  }
  
  // Calcular tiempo restante
  const appointmentDateTime = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`);
  const now = new Date();
  const hoursUntil = (appointmentDateTime - now) / (1000 * 60 * 60);
  const minutesUntil = Math.round(hoursUntil * 60);
  
  console.log(`[SW-AUTO]    â° Tiempo restante: ${hoursUntil.toFixed(2)}h (${minutesUntil} min)`);
  
  // Si estÃ¡ dentro de la ventana de 2 horas, notificar
  if (hoursUntil <= NOTIFICATION_WINDOW_HOURS && hoursUntil > 0) {
    console.log(`[SW-AUTO]    âœ… DENTRO DE VENTANA â†’ Mostrando notificaciÃ³n`);
    await showAppointmentNotification(appointment, hoursUntil);
    await markAsNotified(appointmentId);
    console.log(`[SW-AUTO]    âœ… NotificaciÃ³n mostrada y marcada`);
  } else {
    console.log(`[SW-AUTO]    â¸ï¸  FUERA DE VENTANA (skip)`);
  }
}

/**
 * Muestra notificaciÃ³n de recordatorio de cita usando templates configurables
 */
async function showAppointmentNotification(appointment, hoursUntil) {
  const minutesUntil = Math.round(hoursUntil * 60);
  const customerName = resolveCustomerName(appointment);
  const firstName = customerName.split(' ')[0] || customerName;
  const serviceName = resolveServiceName(appointment);
  const appointmentTime = resolveAppointmentTime(appointment);
  
  // Obtener templates del backend
  const templates = await getNotificationTemplates();
  
  // Usar template de 2 horas si estÃ¡ en ventana
  const titleTemplate = templates.twoHourTitle;
  const bodyTemplate = templates.twoHourBody;
  
  // Parsear variables
  const variables = {
    customerName,
    firstName,
    serviceName,
    time: appointmentTime,
    date: formatDate(appointment.appointmentDate),
    minutesUntil: String(minutesUntil),
    hoursUntil: hoursUntil.toFixed(1),
    businessName: 'BunnyCure',
  };
  
  const title = sanitizePushTitle(parseTemplate(titleTemplate, variables));
  const body = parseTemplate(bodyTemplate, variables);
  
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
 * Obtiene el token de autenticaciÃ³n desde los clientes conectados
 */
let cachedToken = null;

// Listener para recibir respuestas de los clientes
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_APPOINTMENTS_NOW') {
    console.log('[SW-AUTO] Check manual solicitado desde cliente');
    checkUpcomingAppointments();
    return;
  }

  if (event.data && event.data.type === 'AUTH_TOKEN_RESPONSE') {
    cachedToken = event.data.token || null;
    console.log('[SW-AUTO] Token recibido desde cliente');
    saveToIndexedDB(AUTH_TOKEN_CACHE_KEY, cachedToken).catch((error) => {
      console.error('[SW-AUTO] Error persistiendo token:', error);
    });
  }
});

async function getAuthToken() {
  try {
    // Si ya tenemos el token en cache, usarlo
    if (cachedToken) {
      return cachedToken;
    }

    const persistedToken = await getFromIndexedDB(AUTH_TOKEN_CACHE_KEY);
    if (persistedToken) {
      cachedToken = persistedToken;
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

/**
 * Obtiene templates de notificaciones del backend con cache
 */
async function getNotificationTemplates() {
  try {
    // Intentar obtener del cache
    const cached = await getFromIndexedDB(TEMPLATES_CACHE_KEY);
    if (cached && cached.timestamp && (Date.now() - cached.timestamp < TEMPLATES_CACHE_TTL)) {
      console.log('[SW-AUTO] Usando templates desde cache');
      return cached.data;
    }
    
    // Obtener del backend
    const token = await getAuthToken();
    if (!token) {
      console.log('[SW-AUTO] No hay token, usando templates default');
      return DEFAULT_TEMPLATES;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/settings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn('[SW-AUTO] Error obteniendo templates del backend, usando default');
      return DEFAULT_TEMPLATES;
    }
    
    const result = await response.json();
    const templates = result.data?.notificationTemplates || DEFAULT_TEMPLATES;
    
    // Cachear templates
    await saveToIndexedDB(TEMPLATES_CACHE_KEY, {
      timestamp: Date.now(),
      data: templates,
    });
    
    console.log('[SW-AUTO] Templates obtenidos del backend y cacheados');
    return templates;
    
  } catch (error) {
    console.error('[SW-AUTO] Error obteniendo templates:', error);
    return DEFAULT_TEMPLATES;
  }
}

/**
 * Parsea un template reemplazando variables
 */
function parseTemplate(template, variables) {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  
  return result;
}

/**
 * Formatea una fecha YYYY-MM-DD a DD/MM/YYYY
 */
function formatDate(dateStr) {
  try {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  } catch (error) {
    return dateStr;
  }
}

function resolveCustomerName(appointment) {
  if (appointment?.customer?.fullName) {
    return appointment.customer.fullName;
  }

  const firstName = appointment?.customer?.firstName || '';
  const lastName = appointment?.customer?.lastName || '';
  const composed = `${firstName} ${lastName}`.trim();

  if (composed) {
    return composed;
  }

  return 'Cliente';
}

function resolveServiceName(appointment) {
  return appointment?.service?.name || appointment?.serviceName || 'Servicio';
}

function resolveAppointmentTime(appointment) {
  if (typeof appointment?.appointmentTime === 'string') {
    return appointment.appointmentTime.slice(0, 5);
  }
  return 'Horario por confirmar';
}

console.log('[SW] Service Worker cargado correctamente');


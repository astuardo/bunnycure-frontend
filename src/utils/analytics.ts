/**
 * Google Analytics 4 - Utility Functions
 * Handles event tracking and page views
 */

import ReactGA from 'react-ga4';

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

/**
 * Initialize Google Analytics 4
 */
export const initializeGA = () => {
  if (!GA_MEASUREMENT_ID) {
    console.warn('GA4 Measurement ID not configured');
    return;
  }
  ReactGA.initialize(GA_MEASUREMENT_ID);
  console.log('✅ GA4 initialized with ID:', GA_MEASUREMENT_ID);
};

/**
 * Track a custom event in GA4
 */
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, string | number | boolean>
) => {
  if (!GA_MEASUREMENT_ID) return;
  
  try {
    ReactGA.event(eventName, {
      ...eventParams,
      timestamp: new Date().toISOString(),
    });
    console.log(`[GA4] Event: ${eventName}`, eventParams);
  } catch (error) {
    console.error(`[GA4] Error tracking event ${eventName}:`, error);
  }
};

/**
 * Track page view
 */
export const trackPageView = (path: string, title?: string) => {
  if (!GA_MEASUREMENT_ID) return;
  
  try {
    // En react-ga4 v3, se usa send para pageview
    ReactGA.send({
      hitType: 'pageview',
      page: path,
      title: title || document.title,
    });
    console.log(`[GA4] Page View: ${path}${title ? ` - ${title}` : ''}`);
  } catch (error) {
    console.error(`[GA4] Error tracking page view:`, error);
  }
};

/**
 * Set user properties
 */
export const setUserProperties = (
  userId: string | number,
  userRole?: string,
  businessId?: string | number
) => {
  if (!GA_MEASUREMENT_ID) return;
  
  try {
    const properties: Record<string, string | number> = {
      user_id: userId,
    };
    
    if (userRole) properties.user_role = userRole;
    if (businessId) properties.business_id = businessId;
    
    Object.entries(properties).forEach(([key, value]) => {
      ReactGA.set({ [key]: value });
    });
    
    console.log('[GA4] User properties set:', properties);
  } catch (error) {
    console.error('[GA4] Error setting user properties:', error);
  }
};

/**
 * ═══════════════════════════════════════════════════════════════
 * EVENT TRACKING HELPERS - Business Events
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Track appointment creation
 */
export const trackAppointmentCreated = (
  customerId: number,
  serviceNames: string[],
  totalPrice: number
) => {
  trackEvent('appointment_created', {
    customer_id: customerId,
    service_count: serviceNames.length,
    services: serviceNames.join(', '),
    total_price: totalPrice,
  });
};

/**
 * Track appointment update/edit
 */
export const trackAppointmentUpdated = (
  appointmentId: number,
  changeType: string
) => {
  trackEvent('appointment_updated', {
    appointment_id: appointmentId,
    change_type: changeType,
  });
};

/**
 * Track appointment cancellation
 */
export const trackAppointmentCancelled = (
  appointmentId: number,
  customerId: number,
  cancellationReason?: string
) => {
  trackEvent('appointment_cancelled', {
    appointment_id: appointmentId,
    customer_id: customerId,
    cancellation_reason: cancellationReason || 'not_specified',
  });
};

/**
 * Track customer creation
 */
export const trackCustomerCreated = (
  customerName: string,
  phone?: string
) => {
  trackEvent('customer_created', {
    customer_name: customerName,
    phone: phone ? 'provided' : 'not_provided',
  });
};

/**
 * Track login event
 */
export const trackLogin = (userId: number, userEmail?: string) => {
  trackEvent('login', {
    user_id: userId,
    user_email: userEmail || 'unknown',
  });
};

/**
 * Track service view
 */
export const trackServiceView = (serviceName: string, serviceCount?: number) => {
  trackEvent('service_view', {
    service_name: serviceName,
    total_services: serviceCount || 0,
  });
};

/**
 * Track booking request received
 */
export const trackBookingRequestReceived = (
  customerId: number,
  serviceNames: string[]
) => {
  trackEvent('booking_request_received', {
    customer_id: customerId,
    services: serviceNames.join(', '),
  });
};

/**
 * Track booking request approved/rejected
 */
export const trackBookingRequestActionTaken = (
  bookingId: number,
  action: 'approved' | 'rejected'
) => {
  trackEvent('booking_request_action', {
    booking_id: bookingId,
    action: action,
  });
};

/**
 * ═══════════════════════════════════════════════════════════════
 * PAGE VIEW TRACKING - Main Pages
 * ═══════════════════════════════════════════════════════════════
 */

export const GA_PAGES = {
  DASHBOARD: { path: '/dashboard', title: 'Dashboard' },
  APPOINTMENTS: { path: '/appointments', title: 'Appointments' },
  CUSTOMERS: { path: '/customers', title: 'Customers' },
  CALENDAR: { path: '/calendar', title: 'Calendar' },
  SETTINGS: { path: '/settings', title: 'Settings' },
  ANALYTICS: { path: '/analytics', title: 'Analytics' },
  LOGIN: { path: '/login', title: 'Login' },
  BOOKING_REQUESTS: { path: '/booking-requests', title: 'Booking Requests' },
  REMINDERS: { path: '/reminders', title: 'Reminders' },
} as const;

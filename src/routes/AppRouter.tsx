import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import RoleProtectedRoute from '../components/RoleProtectedRoute';
import PlanFeatureGate from '../components/billing/PlanFeatureGate';
import { usePageViewTracking } from '../hooks/usePageViewTracking';
import { useAuthStore } from '../stores/authStore';
import { getSavedPassId, isStaffDevice } from '../utils/publicRoutes';

// ─── Carga Perezosa (Lazy Loading) de Páginas ──────────────────────────────
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const AppointmentsPage = lazy(() => import('../pages/appointments/AppointmentsPage'));
const CustomersPage = lazy(() => import('../pages/customers/CustomersPage'));
const CustomerDetailsPage = lazy(() => import('../pages/customers/CustomerDetailsPage'));
const ServicesPage = lazy(() => import('../pages/services/ServicesPage'));
const ProductsPage = lazy(() => import('../pages/ProductsPage'));
const BookingRequestsPage = lazy(() => import('../pages/booking-requests/BookingRequestsPage'));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'));
const LoyaltySettingsPage = lazy(() => import('../pages/settings/LoyaltySettingsPage'));
const CalendarPage = lazy(() => import('../pages/calendar/CalendarPage'));
const RemindersPage = lazy(() => import('../pages/reminders/RemindersPage'));
const MarketingCampaignsPage = lazy(() => import('../pages/marketing/MarketingCampaignsPage'));
const AnalyticsPage = lazy(() => import('../pages/analytics/AnalyticsPage'));
const InvoicesPage = lazy(() => import('../pages/invoices/InvoicesPage'));
const CommissionsPage = lazy(() => import('../pages/commissions/CommissionsPage'));
const UsersPage = lazy(() => import('../pages/users/UsersPage'));
const TenantsPage = lazy(() => import('../pages/admin/TenantsPage'));
const GiftCardsPage = lazy(() => import('../pages/giftcards/GiftCardsPage'));
const GenerateGiftCardPage = lazy(() => import('../pages/giftcards/GenerateGiftCardPage'));
const PublicGiftCardPage = lazy(() => import('../pages/giftcards/PublicGiftCardPage'));
const PublicBookingPage = lazy(() => import('../pages/booking-requests/PublicBookingPage'));
const PublicLoyaltyCardPage = lazy(() => import('../pages/loyalty/PublicLoyaltyCardPage'));
const InstallPage = lazy(() => import('../pages/InstallPage'));
const TestApiPage = lazy(() => import('../pages/TestApiPage'));
const DemoLandingPage = lazy(() => import('../pages/demo/DemoLandingPage'));
const TermsOfServicePage = lazy(() => import('../pages/legal/TermsOfServicePage'));
const PrivacyPolicyPage = lazy(() => import('../pages/legal/PrivacyPolicyPage'));
const PlatformLegalPage = lazy(() => import('../pages/legal/PlatformLegalPage'));
const SignupPage = lazy(() => import('../pages/signup/SignupPage'));
const VerifyEmailPage = lazy(() => import('../pages/signup/VerifyEmailPage'));
const SubscriptionPage = lazy(() => import('../pages/billing/SubscriptionPage'));

/**
 * Pantalla de carga con estilo elegante BunnyCure para transiciones de ruta
 */
function BunnyRouteLoading() {
    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(180deg, #fdf6f3 0%, #fdf0ec 100%)',
                gap: '12px',
                color: '#5c3d2e',
            }}
        >
            <div
                style={{
                    fontSize: '40px',
                    filter: 'drop-shadow(0 2px 8px rgba(180, 120, 100, 0.2))',
                }}
            >
                🐰
            </div>
            <div style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.3px', color: '#5c3d2e' }}>
                BunnyCure
            </div>
            <div
                className="spinner-border text-primary"
                role="status"
                style={{ width: '1.75rem', height: '1.75rem', color: '#c9897a !important' }}
            >
                <span className="visually-hidden">Cargando...</span>
            </div>
        </div>
    );
}

/**
 * Redirección inteligente en la raíz (/):
 * - Si el usuario ya tiene sesión activa o es personal del salón: va a /dashboard
 * - Si es una clienta que escaneó/guardó su tarjeta Bunny Pass en este dispositivo (PWA): va a /mi-tarjeta/:publicId directamente sin pedir login
 * - Si no: va a /login para el personal del salón
 */
function RootRedirect() {
    const { isAuthenticated, user } = useAuthStore();

    if (isAuthenticated && user) {
        return <Navigate to="/dashboard" replace />;
    }

    // En la plataforma de gestión (app.*, admin.*) o en dispositivos de personal,
    // la raíz siempre redirige al inicio de sesión administrativo
    const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
    const isAppHost = hostname.startsWith('app.') || hostname.startsWith('admin.') || hostname === 'localhost';

    if (!isAppHost && !isStaffDevice()) {
        const savedPassId = getSavedPassId();
        if (savedPassId) {
            return <Navigate to={`/mi-tarjeta/${savedPassId}`} replace />;
        }
    }

    return <Navigate to="/login" replace />;
}

/**
 * Componente interno que usa usePageViewTracking dentro de BrowserRouter
 */
function RoutesWithTracking() {
    usePageViewTracking();

    return (
        <Suspense fallback={<BunnyRouteLoading />}>
            <Routes>
                {/* Rutas Públicas */}
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/install" element={<InstallPage />} />
                {import.meta.env.DEV && <Route path="/test" element={<TestApiPage />} />}
                <Route path="/giftcards/public/:code" element={<PublicGiftCardPage />} />
                <Route path="/reservar" element={<PublicBookingPage />} />
                <Route path="/mi-tarjeta/:publicId" element={<PublicLoyaltyCardPage />} />
                <Route path="/tarjeta/:publicId" element={<PublicLoyaltyCardPage />} />
                <Route path="/pass/:publicId" element={<PublicLoyaltyCardPage />} />
                <Route path="/demo" element={<DemoLandingPage />} />
                <Route path="/presentacion" element={<DemoLandingPage />} />
                <Route path="/landing" element={<DemoLandingPage />} />
                <Route path="/terminos" element={<TermsOfServicePage />} />
                <Route path="/terms" element={<TermsOfServicePage />} />
                <Route path="/privacidad" element={<PrivacyPolicyPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                {/* Registro autoservicio y documentos legales de la plataforma (relación plataforma ↔ salón) */}
                <Route path="/registro" element={<SignupPage />} />
                <Route path="/registro/verificar" element={<VerifyEmailPage />} />
                <Route path="/plataforma/:document" element={<PlatformLegalPage />} />

                {/* Rutas Protegidas Universales */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <DashboardPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/appointments"
                    element={
                        <ProtectedRoute>
                            <AppointmentsPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/customers"
                    element={
                        <ProtectedRoute>
                            <CustomersPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/customers/:id"
                    element={
                        <ProtectedRoute>
                            <CustomerDetailsPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/calendar"
                    element={
                        <ProtectedRoute>
                            <CalendarPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/settings/loyalty"
                    element={
                        <ProtectedRoute>
                            <LoyaltySettingsPage />
                        </ProtectedRoute>
                    }
                />

                {/* Rutas Protegidas para Administración y Recepción */}
                <Route
                    path="/services"
                    element={
                        <RoleProtectedRoute allowedRoles={['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST']}>
                            <ServicesPage />
                        </RoleProtectedRoute>
                    }
                />

                <Route
                    path="/giftcards"
                    element={
                        <RoleProtectedRoute allowedRoles={['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST']}>
                            <PlanFeatureGate feature="GIFT_CARDS"><GiftCardsPage /></PlanFeatureGate>
                        </RoleProtectedRoute>
                    }
                />

                <Route
                    path="/giftcards/generar"
                    element={
                        <RoleProtectedRoute allowedRoles={['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST']}>
                            <PlanFeatureGate feature="GIFT_CARDS"><GenerateGiftCardPage /></PlanFeatureGate>
                        </RoleProtectedRoute>
                    }
                />

                <Route
                    path="/booking-requests"
                    element={
                        <RoleProtectedRoute allowedRoles={['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST']}>
                            <BookingRequestsPage />
                        </RoleProtectedRoute>
                    }
                />

                <Route
                    path="/reminders"
                    element={
                        <RoleProtectedRoute allowedRoles={['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST']}>
                            <RemindersPage />
                        </RoleProtectedRoute>
                    }
                />

                <Route
                    path="/marketing"
                    element={
                        <RoleProtectedRoute allowedRoles={['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN']}>
                            <PlanFeatureGate feature="MARKETING_CAMPAIGNS"><MarketingCampaignsPage /></PlanFeatureGate>
                        </RoleProtectedRoute>
                    }
                />

                <Route
                    path="/analytics"
                    element={
                        <RoleProtectedRoute allowedRoles={['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST']}>
                            <AnalyticsPage />
                        </RoleProtectedRoute>
                    }
                />

                <Route
                    path="/invoices"
                    element={
                        <RoleProtectedRoute allowedRoles={['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST']}>
                            <PlanFeatureGate feature="SII_INVOICING"><InvoicesPage /></PlanFeatureGate>
                        </RoleProtectedRoute>
                    }
                />

                <Route
                    path="/commissions"
                    element={
                        <RoleProtectedRoute allowedRoles={['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN']}>
                            <PlanFeatureGate feature="COMMISSIONS"><CommissionsPage /></PlanFeatureGate>
                        </RoleProtectedRoute>
                    }
                />

                {/* Rutas Exclusivas para Dueña / SuperAdmin */}
                <Route
                    path="/products"
                    element={
                        <RoleProtectedRoute allowedRoles={['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN']}>
                            <PlanFeatureGate feature="INVENTORY"><ProductsPage /></PlanFeatureGate>
                        </RoleProtectedRoute>
                    }
                />

                <Route
                    path="/users"
                    element={
                        <RoleProtectedRoute allowedRoles={['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN']}>
                            <UsersPage />
                        </RoleProtectedRoute>
                    }
                />

                <Route
                    path="/suscripcion"
                    element={
                        <RoleProtectedRoute allowedRoles={['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN']}>
                            <SubscriptionPage />
                        </RoleProtectedRoute>
                    }
                />

                <Route
                    path="/admin/tenants"
                    element={
                        <RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']} requireRootTenant>
                            <TenantsPage />
                        </RoleProtectedRoute>
                    }
                />

                <Route
                    path="/settings"
                    element={
                        <RoleProtectedRoute allowedRoles={['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN']}>
                            <SettingsPage />
                        </RoleProtectedRoute>
                    }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Suspense>
    );
}

export default function AppRouter() {
    return (
        <BrowserRouter>
            <RoutesWithTracking />
        </BrowserRouter>
    );
}

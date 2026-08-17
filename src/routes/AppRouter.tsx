import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { usePageViewTracking } from '../hooks/usePageViewTracking';

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
const AnalyticsPage = lazy(() => import('../pages/analytics/AnalyticsPage'));
const GiftCardsPage = lazy(() => import('../pages/giftcards/GiftCardsPage'));
const GenerateGiftCardPage = lazy(() => import('../pages/giftcards/GenerateGiftCardPage'));
const PublicGiftCardPage = lazy(() => import('../pages/giftcards/PublicGiftCardPage'));
const PublicBookingPage = lazy(() => import('../pages/booking-requests/PublicBookingPage'));
const InstallPage = lazy(() => import('../pages/InstallPage'));
const TestApiPage = lazy(() => import('../pages/TestApiPage'));

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
 * Componente interno que usa usePageViewTracking dentro de BrowserRouter
 */
function RoutesWithTracking() {
    usePageViewTracking();

    return (
        <Suspense fallback={<BunnyRouteLoading />}>
            <Routes>
                {/* Rutas Públicas */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/install" element={<InstallPage />} />
                <Route path="/test" element={<TestApiPage />} />
                <Route path="/giftcards/public/:code" element={<PublicGiftCardPage />} />
                <Route path="/reservar" element={<PublicBookingPage />} />

                {/* Rutas Protegidas */}
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
                    path="/services"
                    element={
                        <ProtectedRoute>
                            <ServicesPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/products"
                    element={
                        <ProtectedRoute>
                            <ProductsPage />
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
                    path="/settings"
                    element={
                        <ProtectedRoute>
                            <SettingsPage />
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

                <Route
                    path="/giftcards"
                    element={
                        <ProtectedRoute>
                            <GiftCardsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/giftcards/generar"
                    element={
                        <ProtectedRoute>
                            <GenerateGiftCardPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/booking-requests"
                    element={
                        <ProtectedRoute>
                            <BookingRequestsPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/reminders"
                    element={
                        <ProtectedRoute>
                            <RemindersPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/analytics"
                    element={
                        <ProtectedRoute>
                            <AnalyticsPage />
                        </ProtectedRoute>
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

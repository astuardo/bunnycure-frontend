import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import LoginPage from '../pages/auth/LoginPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import AppointmentsPage from '../pages/appointments/AppointmentsPage';
import CustomersPage from '../pages/customers/CustomersPage';
import CustomerDetailsPage from '../pages/customers/CustomerDetailsPage';
import ServicesPage from '../pages/services/ServicesPage';
import BookingRequestsPage from '../pages/booking-requests/BookingRequestsPage';
import SettingsPage from '../pages/settings/SettingsPage';
import LoyaltySettingsPage from '../pages/settings/LoyaltySettingsPage';
import CalendarPage from '../pages/calendar/CalendarPage';
import RemindersPage from '../pages/reminders/RemindersPage';
import AnalyticsPage from '../pages/analytics/AnalyticsPage';
import GiftCardsPage from '../pages/giftcards/GiftCardsPage';
import GenerateGiftCardPage from '../pages/giftcards/GenerateGiftCardPage';
import PublicGiftCardPage from '../pages/giftcards/PublicGiftCardPage';
import InstallPage from '../pages/InstallPage';
import TestApiPage from '../pages/TestApiPage';
import { usePageViewTracking } from '../hooks/usePageViewTracking';

/**
 * Componente interno que usa usePageViewTracking
 * Debe estar DENTRO del contexto de BrowserRouter
 */
function RoutesWithTracking() {
    // Este hook funciona aquí porque está dentro de <BrowserRouter>
    usePageViewTracking();

    return (
        <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/install" element={<InstallPage />} />
            <Route path="/test" element={<TestApiPage />} />
            <Route path="/giftcards/public/:code" element={<PublicGiftCardPage />} />

            {/* Protected routes */}
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
    );
}

export default function AppRouter() {
    return (
        <BrowserRouter>
            <RoutesWithTracking />
        </BrowserRouter>
    );
}

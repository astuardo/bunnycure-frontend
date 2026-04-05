import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import AppointmentsPage from '../pages/appointments/AppointmentsPage';
import CustomersPage from '../pages/customers/CustomersPage';
import ServicesPage from '../pages/services/ServicesPage';
import BookingRequestsPage from '../pages/booking-requests/BookingRequestsPage';
import TestApiPage from '../pages/TestApiPage';

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public routes */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/test" element={<TestApiPage />} />

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
                    path="/services"
                    element={
                        <ProtectedRoute>
                            <ServicesPage />
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

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
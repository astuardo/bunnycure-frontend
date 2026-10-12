import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../hooks/useAuth';
import { APP_BUILD_ID_SHORT } from '../../config/buildInfo';
import { Card, CardBody, CardFooter, Button, Input, Alert } from '../../components/ui';

const loginSchema = yup.object({
    username: yup.string().required('El usuario es requerido'),
    password: yup.string().required('La contraseña es requerida'),
});

interface LoginFormData {
    username: string;
    password: string;
}

export default function LoginPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
    const [dismissedSessionExpired, setDismissedSessionExpired] = useState(false);
    const [dismissedVersionChanged, setDismissedVersionChanged] = useState(false);
    const [dismissedErrorMessage, setDismissedErrorMessage] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: yupResolver(loginSchema),
    });

    const { sessionExpired, versionChanged } = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return {
            sessionExpired: params.get('expired') === 'true',
            versionChanged: params.get('version') === 'true',
        };
    }, [location.search]);

    const shouldShowError = Boolean(error) && error !== dismissedErrorMessage;

    useEffect(() => {
        return () => clearError();
    }, [clearError]);

    useEffect(() => {
        if (isAuthenticated) {
            // Intentar restaurar la ruta anterior de sessionStorage
            const redirectPath = sessionStorage.getItem('redirectAfterLogin');
            if (redirectPath) {
                sessionStorage.removeItem('redirectAfterLogin');
                navigate(redirectPath, { replace: true });
            } else {
                // Fallback: usar location.state o ir a dashboard
                const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/dashboard';
                navigate(from, { replace: true });
            }
        }
    }, [isAuthenticated, navigate, location]);

    const onSubmit = async (data: LoginFormData) => {
        setDismissedErrorMessage(null);
        try {
            await login(data.username, data.password);
        } catch {
            // El mensaje de error se obtiene desde el authStore
        }
    };

    return (
        <div className="min-h-screen min-h-[100dvh] bg-bunny-primary-light flex items-center justify-center p-4 selection:bg-bunny-primary selection:text-white">
            <div className="w-full max-w-md mx-auto">
                <Card className="shadow-bunny-lg border-bunny-border">
                    <CardBody className="p-6 sm:p-8">
                        <div className="text-center mb-6">
                            <h2 className="text-3xl font-extrabold text-bunny-primary tracking-tight">💅 BunnyCure</h2>
                            <p className="text-sm font-medium text-bunny-text-muted mt-1">Sistema de Gestión y Citas</p>
                        </div>

                        {sessionExpired && !dismissedSessionExpired && (
                            <Alert
                                variant="warning"
                                dismissible
                                onClose={() => setDismissedSessionExpired(true)}
                                className="mb-4"
                            >
                                Tu sesión ha expirado. Por favor, inicia sesión nuevamente.
                            </Alert>
                        )}

                        {versionChanged && !dismissedVersionChanged && (
                            <Alert
                                variant="info"
                                dismissible
                                onClose={() => setDismissedVersionChanged(true)}
                                className="mb-4"
                            >
                                Se detectó una nueva versión de la app. Inicia sesión para continuar.
                            </Alert>
                        )}

                        {shouldShowError && error && (
                            <Alert
                                variant="danger"
                                title="Error de autenticación"
                                dismissible
                                onClose={() => {
                                    setDismissedErrorMessage(error);
                                    clearError();
                                }}
                                className="mb-4"
                            >
                                {error}
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <Input
                                id="username"
                                label="Usuario"
                                placeholder="Ingresa tu usuario"
                                error={errors.username?.message}
                                disabled={isSubmitting || isLoading}
                                autoFocus
                                {...register('username')}
                            />

                            <Input
                                id="password"
                                type="password"
                                label="Contraseña"
                                placeholder="Ingresa tu contraseña"
                                error={errors.password?.message}
                                disabled={isSubmitting || isLoading}
                                {...register('password')}
                            />

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    fullWidth
                                    isLoading={isSubmitting || isLoading}
                                    loadingText="Iniciando sesión..."
                                >
                                    Iniciar Sesión
                                </Button>
                            </div>

                            <div className="text-center pt-2">
                                <Link
                                    to="/forgot-password"
                                    className="text-xs font-medium text-bunny-text-muted hover:text-bunny-primary transition-colors underline-offset-4 hover:underline"
                                >
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
                        </form>
                    </CardBody>

                    <CardFooter className="text-center py-3.5 bg-bunny-paper/80 border-t border-bunny-border">
                        <p className="mb-0 text-xs text-bunny-text-muted font-medium">
                            BunnyCure v1.0 - PWA | Build {APP_BUILD_ID_SHORT}
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

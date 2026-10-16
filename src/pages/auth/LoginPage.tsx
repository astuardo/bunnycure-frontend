import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../context/TenantContext';
import { APP_BUILD_ID_SHORT } from '../../config/buildInfo';
import { Card, CardBody, CardFooter, Button, Input, Alert } from '../../components/ui';
import { billingApi } from '../../api/billing.api';

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
    const { tenant } = useTenant();
    const [dismissedSessionExpired, setDismissedSessionExpired] = useState(false);
    const [dismissedVersionChanged, setDismissedVersionChanged] = useState(false);
    const [dismissedErrorMessage, setDismissedErrorMessage] = useState<string | null>(null);

    const [verificationResent, setVerificationResent] = useState(false);

    const {
        register,
        handleSubmit,
        getValues,
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
                            {tenant.logoUrl && tenant.logoUrl !== '/images/logo.png' ? (
                                <div className="mb-3 flex justify-center">
                                    <img
                                        src={tenant.logoUrl}
                                        alt={tenant.name}
                                        className="h-16 w-auto max-h-16 object-contain rounded-xl shadow-xs"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLElement).style.display = 'none';
                                        }}
                                    />
                                </div>
                            ) : null}
                            <h2 className="text-3xl font-extrabold text-bunny-primary tracking-tight">
                                💅 {tenant.name || 'BunnyCure'}
                            </h2>
                            <p className="text-sm font-medium text-bunny-text-muted mt-1">
                                {tenant.slogan || 'Sistema de Gestión y Citas'}
                            </p>
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
                                {/* Registro autoservicio sin verificar (EMAIL_NOT_VERIFIED) */}
                                {error.startsWith('Confirma tu email') && (
                                    <button
                                        type="button"
                                        className="block mt-2 text-xs font-semibold underline"
                                        disabled={verificationResent}
                                        onClick={async () => {
                                            await billingApi.resendVerification(getValues('username')).catch(() => undefined);
                                            setVerificationResent(true);
                                        }}
                                    >
                                        {verificationResent ? 'Te enviamos un nuevo enlace' : 'Reenviar el enlace de verificación'}
                                    </button>
                                )}
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

                            <div className="text-center pt-3 mt-1 border-t border-bunny-border/50">
                                <Link
                                    to="/demo"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-bunny-primary hover:text-bunny-primary-hover transition-colors"
                                >
                                    <span>✨</span> Conoce las funciones y planes del software ↗
                                </Link>
                                <div className="mt-2">
                                    <Link
                                        to="/registro"
                                        className="text-xs font-medium text-bunny-text-muted hover:text-bunny-primary underline-offset-4 hover:underline"
                                    >
                                        ¿Tienes un salón? Crea tu cuenta gratis
                                    </Link>
                                </div>
                            </div>
                        </form>
                    </CardBody>

                    <CardFooter className="text-center py-3.5 bg-bunny-paper/80 border-t border-bunny-border space-y-1">
                        <p className="mb-0 text-xs text-bunny-text-muted font-medium">
                            {tenant.name || 'BunnyCure'} v1.0 - PWA | Build {APP_BUILD_ID_SHORT}
                        </p>
                        <div className="flex justify-center items-center gap-3 text-[11px] text-bunny-text-muted pt-0.5">
                            <Link to="/terminos" className="hover:text-bunny-primary transition-colors underline-offset-2 hover:underline">
                                Términos del Servicio
                            </Link>
                            <span>•</span>
                            <Link to="/privacidad" className="hover:text-bunny-primary transition-colors underline-offset-2 hover:underline">
                                Privacidad (Ley 19.628)
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

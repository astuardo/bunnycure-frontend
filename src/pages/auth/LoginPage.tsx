import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { APP_BUILD_ID_SHORT } from '../../config/buildInfo';

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
        <div className="bunny-auth-page d-flex align-items-center justify-content-center">
            <Container fluid>
                <Row className="w-100">
                    <Col xs={12} sm={10} md={6} lg={4} className="mx-auto">
                        <Card>
                        <Card.Body className="p-4">
                            <div className="text-center mb-4">
                                <h2 className="fw-bold text-primary">💅 BunnyCure</h2>
                                <p className="text-muted">Sistema de Gestión</p>
                            </div>

                            {sessionExpired && !dismissedSessionExpired && (
                                <Alert 
                                    variant="warning" 
                                    dismissible 
                                    onClose={() => setDismissedSessionExpired(true)}
                                    className="mb-3"
                                >
                                    <i className="bi bi-clock-history me-2"></i>
                                    Tu sesión ha expirado. Por favor, inicia sesión nuevamente.
                                </Alert>
                            )}

                            {versionChanged && !dismissedVersionChanged && (
                                <Alert
                                    variant="info"
                                    dismissible
                                    onClose={() => setDismissedVersionChanged(true)}
                                    className="mb-3"
                                >
                                    <i className="bi bi-arrow-repeat me-2"></i>
                                    Se detectó una nueva versión de la app. Inicia sesión para continuar.
                                </Alert>
                            )}

                            {shouldShowError && error && (
                                <Alert
                                    variant="danger"
                                    dismissible
                                    onClose={() => {
                                        setDismissedErrorMessage(error);
                                        clearError();
                                    }}
                                >
                                    <Alert.Heading>Error de autenticación</Alert.Heading>
                                    <p className="mb-0">{error}</p>
                                </Alert>
                            )}

                            <Form onSubmit={handleSubmit(onSubmit)}>
                                <Form.Group className="mb-3" controlId="username">
                                    <Form.Label>Usuario</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Ingresa tu usuario"
                                        {...register('username')}
                                        isInvalid={!!errors.username}
                                        disabled={isSubmitting || isLoading}
                                        autoFocus
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.username?.message}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="password">
                                    <Form.Label>Contraseña</Form.Label>
                                    <Form.Control
                                        type="password"
                                        placeholder="Ingresa tu contraseña"
                                        {...register('password')}
                                        isInvalid={!!errors.password}
                                        disabled={isSubmitting || isLoading}
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.password?.message}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Button
                                    variant="primary"
                                    type="submit"
                                    className="w-100 mb-3"
                                    disabled={isSubmitting || isLoading}
                                >
                                    {isSubmitting || isLoading ? (
                                        <>
                                            <Spinner
                                                as="span"
                                                animation="border"
                                                size="sm"
                                                role="status"
                                                aria-hidden="true"
                                                className="me-2"
                                            />
                                            Iniciando sesión...
                                        </>
                                    ) : (
                                        'Iniciar Sesión'
                                    )}
                                </Button>

                                <div className="text-center">
                                    <Link to="/forgot-password" className="text-muted small text-decoration-none">
                                        ¿Olvidaste tu contraseña?
                                    </Link>
                                </div>
                            </Form>
                        </Card.Body>

                        <Card.Footer className="text-center text-muted small">
                            <p className="mb-0">BunnyCure v1.0 - PWA | Build {APP_BUILD_ID_SHORT}</p>
                        </Card.Footer>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';

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
    const [showError, setShowError] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: yupResolver(loginSchema),
    });

    useEffect(() => {
        return () => clearError();
    }, [clearError]);

    useEffect(() => {
        if (error) {
            setShowError(true);
        }
    }, [error]);

    useEffect(() => {
        if (isAuthenticated) {
            const from = (location.state as any)?.from?.pathname || '/dashboard';
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, location]);

    const onSubmit = async (data: LoginFormData) => {
        try {
            setShowError(false);
            await login(data.username, data.password);
        } catch (err) {
            setShowError(true);
        }
    };

    return (
        <Container fluid className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
            <Row className="w-100">
                <Col xs={12} sm={10} md={6} lg={4} className="mx-auto">
                    <Card className="shadow">
                        <Card.Body className="p-4">
                            <div className="text-center mb-4">
                                <h2 className="fw-bold text-primary">💅 BunnyCure</h2>
                                <p className="text-muted">Sistema de Gestión</p>
                            </div>

                            {showError && error && (
                                <Alert
                                    variant="danger"
                                    dismissible
                                    onClose={() => {
                                        setShowError(false);
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
                                    <a href="/forgot-password" className="text-muted small">
                                        ¿Olvidaste tu contraseña?
                                    </a>
                                </div>
                            </Form>
                        </Card.Body>

                        <Card.Footer className="text-center text-muted small">
                            <p className="mb-0">BunnyCure v1.0 - PWA</p>
                        </Card.Footer>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}
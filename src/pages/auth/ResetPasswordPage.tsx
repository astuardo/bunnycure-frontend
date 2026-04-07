/**
 * Página de Reset de Contraseña
 * Permite establecer una nueva contraseña usando un token válido
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FaKey, FaCheckCircle } from 'react-icons/fa';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { passwordApi } from '../../api/password.api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setTokenValid(false);
      setValidatingToken(false);
      return;
    }

    try {
      const isValid = await passwordApi.validateToken(token);
      setTokenValid(isValid);
    } catch (err) {
      console.error('Error validating token:', err);
      setTokenValid(false);
    } finally {
      setValidatingToken(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await passwordApi.resetPassword(token, newPassword, confirmPassword);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Error resetting password:', err);
      setError('Error al restablecer la contraseña. El enlace puede haber expirado.');
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-center text-white">
          <Spinner animation="border" />
          <p className="mt-3">Validando enlace...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-vh-100 d-flex align-items-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Container>
          <Row className="justify-content-center">
            <Col md={6} lg={5}>
              <Card className="shadow-lg">
                <Card.Body className="p-5 text-center">
                  <div className="text-danger mb-3">
                    <FaKey size={60} />
                  </div>
                  <h3 className="fw-bold mb-3">Enlace Inválido o Expirado</h3>
                  <p className="text-muted mb-4">
                    El enlace de recuperación de contraseña es inválido o ha expirado.
                    Por favor, solicita uno nuevo.
                  </p>
                  <div className="d-grid gap-2">
                    <Link to="/forgot-password" className="btn btn-primary">
                      Solicitar Nuevo Enlace
                    </Link>
                    <Link to="/login" className="btn btn-outline-secondary">
                      Volver al Login
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex align-items-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={5}>
            <Card className="shadow-lg">
              <Card.Body className="p-5">
                <div className="text-center mb-4">
                  <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3">
                    <FaKey size={40} className="text-primary" />
                  </div>
                  <h3 className="fw-bold">Restablecer Contraseña</h3>
                  <p className="text-muted">
                    Ingresa tu nueva contraseña
                  </p>
                </div>

                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError(null)}>
                    {error}
                  </Alert>
                )}

                {success ? (
                  <div>
                    <Alert variant="success" className="text-center">
                      <FaCheckCircle size={50} className="mb-3" />
                      <h5 className="fw-bold">¡Contraseña Actualizada!</h5>
                      <p className="mb-0">
                        Tu contraseña ha sido restablecida exitosamente.
                        Serás redirigido al login...
                      </p>
                    </Alert>
                  </div>
                ) : (
                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nueva Contraseña</Form.Label>
                      <Form.Control
                        type="password"
                        placeholder="Mínimo 8 caracteres"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        disabled={loading}
                        autoFocus
                      />
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label>Confirmar Contraseña</Form.Label>
                      <Form.Control
                        type="password"
                        placeholder="Repite la contraseña"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </Form.Group>

                    <div className="d-grid gap-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        disabled={loading || !newPassword || !confirmPassword}
                      >
                        {loading ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Restableciendo...
                          </>
                        ) : (
                          <>
                            <FaCheckCircle className="me-2" />
                            Restablecer Contraseña
                          </>
                        )}
                      </Button>
                    </div>
                  </Form>
                )}
              </Card.Body>
            </Card>

            <div className="text-center mt-3">
              <Link to="/login" className="text-white text-decoration-none">
                <small>← Volver al login</small>
              </Link>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

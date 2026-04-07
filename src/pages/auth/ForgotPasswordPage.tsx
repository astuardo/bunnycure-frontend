/**
 * Página de Recuperación de Contraseña
 * Permite solicitar un reset de contraseña por email
 */

import { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FaEnvelope, FaArrowLeft } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { passwordApi } from '../../api/password.api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await passwordApi.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      console.error('Error requesting password reset:', err);
      setError('Error al enviar el email. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={5}>
            <Card className="shadow-lg">
              <Card.Body className="p-5">
                <div className="text-center mb-4">
                  <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3">
                    <FaEnvelope size={40} className="text-primary" />
                  </div>
                  <h3 className="fw-bold">¿Olvidaste tu contraseña?</h3>
                  <p className="text-muted">
                    No te preocupes, te enviaremos un enlace para restablecerla.
                  </p>
                </div>

                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError(null)}>
                    {error}
                  </Alert>
                )}

                {submitted ? (
                  <div>
                    <Alert variant="success">
                      <strong>✅ Email enviado!</strong>
                      <p className="mb-0 mt-2">
                        Si el correo <strong>{email}</strong> está registrado en nuestro sistema,
                        recibirás un enlace para restablecer tu contraseña.
                      </p>
                    </Alert>
                    <div className="d-grid gap-2">
                      <Link to="/login" className="btn btn-primary">
                        <FaArrowLeft className="me-2" />
                        Volver al login
                      </Link>
                    </div>
                  </div>
                ) : (
                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-4">
                      <Form.Label>Correo Electrónico</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                        autoFocus
                      />
                      <Form.Text className="text-muted">
                        Ingresa el email con el que te registraste
                      </Form.Text>
                    </Form.Group>

                    <div className="d-grid gap-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        disabled={loading || !email}
                      >
                        {loading ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <FaEnvelope className="me-2" />
                            Enviar Enlace de Recuperación
                          </>
                        )}
                      </Button>

                      <Link to="/login" className="btn btn-outline-secondary">
                        <FaArrowLeft className="me-2" />
                        Volver al login
                      </Link>
                    </div>
                  </Form>
                )}
              </Card.Body>
            </Card>

            <div className="text-center mt-3 text-white">
              <small>
                ¿Necesitas ayuda? Contacta al administrador del sistema
              </small>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

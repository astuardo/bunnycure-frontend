/**
 * Página de Recuperación de Contraseña
 * Permite solicitar un reset de contraseña por email (Migrada a Tailwind CSS)
 */

import { useState } from 'react';
import { FaEnvelope, FaArrowLeft } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { passwordApi } from '../../api/password.api';
import { Card, CardBody, Button, Input, Alert } from '../../components/ui';

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
    <div className="min-h-screen min-h-[100dvh] bg-bunny-primary-light flex items-center justify-center p-4 selection:bg-bunny-primary selection:text-white">
      <div className="w-full max-w-md mx-auto">
        <Card className="shadow-bunny-lg border-bunny-border">
          <CardBody className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-bunny-primary/15 flex items-center justify-center mb-4 text-bunny-primary shadow-sm">
                <FaEnvelope size={28} />
              </div>
              <h3 className="text-2xl font-bold text-bunny-text tracking-tight">¿Olvidaste tu contraseña?</h3>
              <p className="text-sm font-medium text-bunny-text-muted mt-1">
                No te preocupes, te enviaremos un enlace para restablecerla.
              </p>
            </div>

            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-4">
                {error}
              </Alert>
            )}

            {submitted ? (
              <div className="space-y-5">
                <Alert variant="success" title="¡Email enviado!">
                  Si el correo <strong className="font-semibold">{email}</strong> está registrado en nuestro sistema,
                  recibirás un enlace para restablecer tu contraseña.
                </Alert>
                <div>
                  <Link to="/login" className="block w-full">
                    <Button variant="primary" size="lg" fullWidth leftIcon={<FaArrowLeft className="mr-2" />}>
                      Volver al login
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  id="email"
                  type="email"
                  label="Correo Electrónico"
                  placeholder="tu@email.com"
                  helperText="Ingresa el email con el que te registraste"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={loading || !email}
                    isLoading={loading}
                    loadingText="Enviando email..."
                  >
                    Enviar Instrucciones
                  </Button>
                </div>

                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="text-xs font-medium text-bunny-text-muted hover:text-bunny-primary transition-colors underline-offset-4 hover:underline"
                  >
                    ← Volver al login
                  </Link>
                </div>
              </form>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

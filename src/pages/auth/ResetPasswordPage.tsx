/**
 * Página de Reset de Contraseña
 * Permite establecer una nueva contraseña usando un token válido (Migrada a Tailwind CSS)
 */

import { useState, useEffect, useCallback } from 'react';
import { FaKey, FaCheckCircle } from 'react-icons/fa';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { passwordApi } from '../../api/password.api';
import { Card, CardBody, Button, Input, Alert, Spinner } from '../../components/ui';

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

  const validateToken = useCallback(async () => {
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
  }, [token]);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

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
      <div className="min-h-screen min-h-[100dvh] bg-bunny-primary-light flex items-center justify-center p-4">
        <div className="text-center flex flex-col items-center gap-3">
          <Spinner size="lg" variant="primary" />
          <p className="text-sm font-medium text-bunny-text-muted">Validando enlace de recuperación...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-bunny-primary-light flex items-center justify-center p-4 selection:bg-bunny-primary selection:text-white">
        <div className="w-full max-w-md mx-auto">
          <Card className="shadow-bunny-lg border-bunny-border">
            <CardBody className="p-6 sm:p-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 flex items-center justify-center mb-4 text-bunny-danger shadow-sm">
                <FaKey size={28} />
              </div>
              <h3 className="text-2xl font-bold text-bunny-text tracking-tight mb-2">Enlace Inválido o Expirado</h3>
              <p className="text-sm font-medium text-bunny-text-muted mb-6">
                El enlace de recuperación de contraseña es inválido o ha expirado. Por favor, solicita uno nuevo.
              </p>
              <div className="space-y-3">
                <Link to="/forgot-password" className="block w-full">
                  <Button variant="primary" size="lg" fullWidth>
                    Solicitar Nuevo Enlace
                  </Button>
                </Link>
                <Link to="/login" className="block w-full">
                  <Button variant="outline" size="md" fullWidth>
                    Volver al Login
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-bunny-primary-light flex items-center justify-center p-4 selection:bg-bunny-primary selection:text-white">
      <div className="w-full max-w-md mx-auto">
        <Card className="shadow-bunny-lg border-bunny-border">
          <CardBody className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-bunny-primary/15 flex items-center justify-center mb-4 text-bunny-primary shadow-sm">
                <FaKey size={28} />
              </div>
              <h3 className="text-2xl font-bold text-bunny-text tracking-tight">Restablecer Contraseña</h3>
              <p className="text-sm font-medium text-bunny-text-muted mt-1">
                Ingresa tu nueva contraseña para acceder al sistema
              </p>
            </div>

            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-4">
                {error}
              </Alert>
            )}

            {success ? (
              <div className="space-y-4">
                <Alert variant="success" className="text-center">
                  <div className="flex flex-col items-center text-center p-2">
                    <FaCheckCircle size={44} className="mb-3 text-emerald-600" />
                    <h5 className="font-bold text-base mb-1">¡Contraseña Actualizada!</h5>
                    <p className="text-sm mb-0">
                      Tu contraseña ha sido restablecida exitosamente. Serás redirigido al login...
                    </p>
                  </div>
                </Alert>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  id="newPassword"
                  type="password"
                  label="Nueva Contraseña"
                  placeholder="Mínimo 8 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                />

                <Input
                  id="confirmPassword"
                  type="password"
                  label="Confirmar Contraseña"
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={loading || !newPassword || !confirmPassword}
                    isLoading={loading}
                    loadingText="Restableciendo..."
                    leftIcon={!loading ? <FaCheckCircle className="mr-2" /> : undefined}
                  >
                    Restablecer Contraseña
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

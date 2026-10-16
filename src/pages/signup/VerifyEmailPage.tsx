import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { billingApi } from '../../api/billing.api';
import { Alert, Button, Input, Spinner } from '../../components/ui';
import { VerifyEmailResponse } from '../../types/billing.types';

/** Destino del enlace del correo de verificación: activa el salón y su prueba gratuita. */
export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [result, setResult] = useState<VerifyEmailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [resent, setResent] = useState(false);
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return; // StrictMode monta dos veces en desarrollo
    requested.current = true;
    if (!token) {
      setError('El enlace de verificación está incompleto.');
      return;
    }
    billingApi
      .verifyEmail(token)
      .then(setResult)
      .catch((err) =>
        setError(isAxiosError(err) ? err.response?.data?.error?.message || 'No pudimos verificar tu email.' : 'No pudimos verificar tu email.')
      );
  }, [token]);

  return (
    <div className="min-h-screen bg-bunny-paper flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-bunny-border shadow-sm p-6 text-center space-y-4">
        {!result && !error && (
          <>
            <Spinner size="lg" className="mx-auto" />
            <p className="text-sm text-bunny-text-muted">Verificando tu email...</p>
          </>
        )}

        {result && (
          <>
            <div className="text-4xl" aria-hidden>🎉</div>
            <h1 className="text-xl font-bold text-bunny-cocoa">¡Tu salón está activo!</h1>
            {result.trialEndsOn && (
              <p className="text-sm text-bunny-text-muted">
                Tu prueba gratuita dura hasta el{' '}
                {new Date(`${result.trialEndsOn}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}.
              </p>
            )}
            <Link
              to={`/login?salon=${encodeURIComponent(result.slug)}`}
              className="inline-block px-5 py-2.5 rounded-xl bg-bunny-primary text-white text-sm font-semibold hover:bg-bunny-primary-hover"
            >
              Iniciar sesión
            </Link>
          </>
        )}

        {error && (
          <>
            <Alert variant="danger">{error}</Alert>
            <p className="text-sm text-bunny-text-muted">Te enviamos un enlace nuevo si tu registro sigue pendiente:</p>
            <Input name="email" type="email" label="Email del registro" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button
              variant="secondary"
              disabled={!email || resent}
              onClick={async () => {
                await billingApi.resendVerification(email).catch(() => undefined);
                setResent(true);
              }}
            >
              {resent ? 'Revisa tu correo' : 'Enviar un enlace nuevo'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

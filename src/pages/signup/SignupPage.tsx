import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { billingApi } from '../../api/billing.api';
import { Alert, Button, Input } from '../../components/ui';
import { Plan, PlanCode, SignupRequest, formatClp } from '../../types/billing.types';

const PRODUCT_NAME = import.meta.env.VITE_PRODUCT_NAME || 'BunnyCure';

const emptyForm: SignupRequest = {
  salonName: '',
  ownerName: '',
  email: '',
  phone: '',
  password: '',
  plan: 'PRO',
  slug: '',
  acceptTerms: false,
  website: '',
};

const apiErrorMessage = (error: unknown): string => {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    const fieldError = data?.error?.fieldErrors?.[0]?.message;
    return fieldError || data?.error?.message || 'No pudimos completar el registro. Intenta nuevamente.';
  }
  return 'No pudimos completar el registro. Intenta nuevamente.';
};

/** Registro autoservicio de un salón nuevo: crea la cuenta y envía el email de verificación. */
export default function SignupPage() {
  const [params] = useSearchParams();
  const [form, setForm] = useState<SignupRequest>(() => ({
    ...emptyForm,
    plan: (['STANDARD', 'PRO', 'VIP'].includes(params.get('plan') || '') ? params.get('plan') : 'PRO') as PlanCode,
  }));
  const [plans, setPlans] = useState<Plan[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    billingApi.getPlans().then(setPlans).catch(() => setPlans([]));
  }, []);

  const set = <K extends keyof SignupRequest>(key: K, value: SignupRequest[K]) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.acceptTerms) {
      setError('Debes aceptar los términos de servicio y la política de privacidad.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await billingApi.signup({ ...form, slug: form.slug?.trim() || undefined });
      setSentTo(response.email);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <div className="min-h-screen bg-bunny-paper flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-bunny-border shadow-sm p-6 text-center space-y-4">
          <div className="text-4xl" aria-hidden>📬</div>
          <h1 className="text-xl font-bold text-bunny-cocoa">Revisa tu correo</h1>
          <p className="text-sm text-bunny-text-muted">
            Enviamos un enlace a <strong>{sentTo}</strong> para confirmar tu email y activar tu prueba gratuita.
            Si no lo ves, revisa la carpeta de spam.
          </p>
          <Button
            variant="secondary"
            disabled={resent}
            onClick={async () => {
              await billingApi.resendVerification(sentTo).catch(() => undefined);
              setResent(true);
            }}
          >
            {resent ? 'Enlace reenviado' : 'Reenviar el enlace'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bunny-paper flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="max-w-lg w-full bg-white rounded-2xl border border-bunny-border shadow-sm p-6 space-y-4" noValidate>
        <header className="text-center">
          <h1 className="text-2xl font-bold text-bunny-cocoa">Crea tu salón en {PRODUCT_NAME}</h1>
          <p className="text-sm text-bunny-text-muted">Prueba gratis por 14 días. Sin tarjeta de crédito.</p>
        </header>

        {error && <Alert variant="danger">{error}</Alert>}

        <fieldset className="grid grid-cols-3 gap-2" aria-label="Plan">
          {(plans.length ? plans : []).map((plan) => (
            <label
              key={plan.code}
              className={`cursor-pointer rounded-xl border p-2 text-center text-xs ${form.plan === plan.code ? 'border-bunny-primary bg-bunny-blush' : 'border-bunny-border'}`}
            >
              <input type="radio" name="plan" value={plan.code} checked={form.plan === plan.code} onChange={() => set('plan', plan.code)} className="sr-only" />
              <div className="font-bold text-bunny-cocoa">{plan.name}</div>
              <div className="text-bunny-text-muted">{formatClp(plan.monthlyPriceClp)}/mes</div>
            </label>
          ))}
        </fieldset>

        <Input name="salonName" label="Nombre del salón" required value={form.salonName} onChange={(e) => set('salonName', e.target.value)} autoComplete="organization" />
        <Input name="ownerName" label="Tu nombre" required value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} autoComplete="name" />
        <Input name="email" label="Email (será tu usuario)" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
        <Input name="phone" label="Teléfono (opcional)" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" placeholder="+569..." />
        <Input
          name="password"
          label="Contraseña"
          type="password"
          required
          minLength={10}
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          autoComplete="new-password"
          helperText="Mínimo 10 caracteres, con letras y números."
        />
        <Input
          name="slug"
          label="Dirección de tu salón (opcional)"
          value={form.slug}
          onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          helperText="Ej: mi-salon. Si la dejas vacía la generamos a partir del nombre."
        />

        {/* Honeypot anti-bots: oculto para personas y lectores de pantalla */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
          <label>
            Sitio web
            <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set('website', e.target.value)} />
          </label>
        </div>

        <label className="flex items-start gap-2 text-sm text-bunny-cocoa">
          <input type="checkbox" checked={form.acceptTerms} onChange={(e) => set('acceptTerms', e.target.checked)} className="mt-1" />
          <span>
            Acepto los{' '}
            <Link to="/plataforma/terminos" target="_blank" className="underline">términos de servicio</Link>, la{' '}
            <Link to="/plataforma/privacidad" target="_blank" className="underline">política de privacidad</Link> y el{' '}
            <Link to="/plataforma/encargo-de-datos" target="_blank" className="underline">acuerdo de tratamiento de datos</Link>.
          </span>
        </label>

        <Button type="submit" fullWidth isLoading={submitting} loadingText="Creando tu salón...">
          Crear mi salón
        </Button>

        <p className="text-center text-xs text-bunny-text-muted">
          ¿Ya tienes cuenta? <Link to="/login" className="underline">Inicia sesión</Link>
        </p>
      </form>
    </div>
  );
}

import { test, expect, type Page, type Route } from '@playwright/test';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'http://localhost:5173',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

const ok = (route: Route, data: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: true, data }),
  });

const PLANS = [
  { code: 'STANDARD', name: 'Emprendedora', monthlyPriceClp: 29900, annualPriceClp: 287040, annualDiscountPercent: 20, maxStaffSeats: 2, features: [] },
  { code: 'PRO', name: 'Studio Pro', monthlyPriceClp: 49900, annualPriceClp: 479040, annualDiscountPercent: 20, maxStaffSeats: 6, features: [] },
  { code: 'VIP', name: 'Franquicias', monthlyPriceClp: 89900, annualPriceClp: 863040, annualDiscountPercent: 20, maxStaffSeats: null, features: [] },
];

const mockPlans = async (page: Page) => {
  await page.route((url) => url.pathname === '/api/public/plans', (route) => ok(route, PLANS));
};

test.describe('Registro autoservicio (/registro)', () => {
  test('muestra los planes con precio y preselecciona el plan de la URL', async ({ page }) => {
    await mockPlans(page);
    await page.goto('/registro?plan=STANDARD');

    await expect(page.getByRole('heading', { name: /crea tu salón/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('$29.900/mes')).toBeVisible();
    await expect(page.getByRole('radio', { name: /emprendedora/i })).toBeChecked();
  });

  test('exige aceptar los términos antes de enviar', async ({ page }) => {
    await mockPlans(page);
    let signupCalled = false;
    await page.route((url) => url.pathname === '/api/public/signup', (route) => {
      signupCalled = true;
      return ok(route, { slug: 'x', email: 'x@x.cl', message: '' }, 201);
    });

    await page.goto('/registro');
    await page.getByRole('button', { name: /crear mi salón/i }).click();

    await expect(page.getByText(/debes aceptar los términos/i)).toBeVisible();
    expect(signupCalled).toBe(false);
  });

  test('envía el registro y muestra "Revisa tu correo"', async ({ page }) => {
    await mockPlans(page);
    let payload: Record<string, unknown> | null = null;
    await page.route((url) => url.pathname === '/api/public/signup', (route) => {
      payload = route.request().postDataJSON();
      return ok(route, { slug: 'salon-luna', email: 'camila@salonluna.cl', message: 'Te enviamos un correo' }, 201);
    });

    await page.goto('/registro?plan=PRO');
    await page.getByLabel('Nombre del salón').fill('Salón Luna');
    await page.getByLabel('Tu nombre').fill('Camila Rojas');
    await page.getByLabel(/email \(será tu usuario\)/i).fill('camila@salonluna.cl');
    await page.getByLabel('Contraseña').fill('ClaveSegura2026');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /crear mi salón/i }).click();

    await expect(page.getByRole('heading', { name: /revisa tu correo/i })).toBeVisible();
    await expect(page.getByText('camila@salonluna.cl')).toBeVisible();
    expect(payload).toMatchObject({ salonName: 'Salón Luna', plan: 'PRO', acceptTerms: true, website: '' });
  });

  test('verificación de email: activa el salón y ofrece iniciar sesión en ese salón', async ({ page }) => {
    await page.route((url) => url.pathname === '/api/public/signup/verify', (route) =>
      ok(route, { slug: 'salon-luna', loginUrl: '/login?salon=salon-luna', trialEndsOn: '2026-10-30' })
    );

    await page.goto('/registro/verificar?token=abc123&salon=salon-luna');

    await expect(page.getByRole('heading', { name: /tu salón está activo/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /iniciar sesión/i })).toHaveAttribute('href', '/login?salon=salon-luna');
  });

  test('los documentos legales de la plataforma se muestran como borrador', async ({ page }) => {
    await page.goto('/plataforma/terminos');
    await expect(page.getByRole('heading', { name: /términos de servicio de la plataforma/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/borrador para revisión legal/i)).toBeVisible();
  });
});

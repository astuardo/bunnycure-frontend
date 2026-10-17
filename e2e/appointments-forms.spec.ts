import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Test de caracterización de los modales de crear y editar cita (/appointments): fija el cuerpo
 * exacto que la página envía a la API, para refactorizar AppointmentsPage sin cambiar su comportamiento.
 */

const json = (route: Route, data: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });

const CUSTOMERS = [
  { id: 7, fullName: 'Valentina Flores', phone: '+56977665544', email: 'valentina@test.cl', active: true },
  { id: 8, fullName: 'Camila Rojas', phone: '+56911223344', email: 'camila@test.cl', active: true },
];
const SERVICES = [
  { id: 1, name: 'Manicure Rusa', price: 22000, durationMinutes: 90, active: true, displayOrder: 1 },
  { id: 2, name: 'Kapping Gel', price: 26000, durationMinutes: 120, active: true, displayOrder: 2 },
];
const EXISTING = {
  id: 101,
  appointmentDate: '2030-03-14',
  appointmentTime: '10:30:00',
  status: 'CONFIRMED',
  notes: '',
  customer: CUSTOMERS[0],
  service: SERVICES[0],
  services: [SERVICES[0]],
  totalPrice: 22000,
  totalDurationMinutes: 90,
  reminderSent: false,
  whatsAppConfirmationSent: true,
};

interface Captured { post?: unknown; put?: unknown }

async function setup(page: Page): Promise<Captured> {
  const captured: Captured = {};
  await page.route('**/api/public/tenant-info*', (r) => json(r, { id: 1, name: 'BunnyCure', slug: 'bunnycure', active: true, planTier: 'PRO' }));
  await page.route('**/api/auth/me', (r) => json(r, { id: 1, username: 'admin', fullName: 'Administradora', role: 'ADMIN', enabled: true }));
  await page.route('**/api/auth/csrf', (r) => json(r, { token: 'csrf' }));
  await page.route('**/api/auth/refresh', (r) => json(r, { token: 'mock-jwt' }));
  await page.route((u) => u.pathname === '/api/appointments', (r) => {
    if (r.request().method() === 'POST') {
      captured.post = r.request().postDataJSON();
      return json(r, { ...EXISTING, id: 202 }, 201);
    }
    return json(r, [EXISTING]);
  });
  await page.route((u) => u.pathname === '/api/appointments/101', (r) => {
    if (r.request().method() === 'PUT') {
      captured.put = r.request().postDataJSON();
    }
    return json(r, EXISTING);
  });
  await page.route((u) => u.pathname.startsWith('/api/customers'), (r) => json(r, CUSTOMERS));
  await page.route((u) => u.pathname.startsWith('/api/services'), (r) => json(r, SERVICES));
  await page.route((u) => u.pathname.startsWith('/api/giftcards'), (r) => json(r, []));
  await page.route((u) => u.pathname.startsWith('/api/settings'), (r) => json(r, {}));
  await page.route((u) => u.pathname.startsWith('/api/stats'), (r) => json(r, {}));
  return captured;
}

test.describe('Formularios de citas (caracterización)', () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'Desktop Chrome', 'flujo de formularios verificado en escritorio');
  });

  test('crear cita: clienta + servicio + hora → resumen → POST con el cuerpo esperado', async ({ page }) => {
    const captured = await setup(page);
    await page.goto('/appointments?status=ALL&date=2030-05-20');

    await page.getByRole('button', { name: '+ Nueva Cita' }).click();
    await page.getByRole('button', { name: /Valentina Flores/ }).first().click();
    await page.getByText('Manicure Rusa', { exact: false }).last().click();
    // Fecha: día 15 del mes siguiente en el calendario interactivo
    await page.getByRole('button', { name: 'Mes siguiente' }).click();
    await page.locator('span', { hasText: /^15$/ }).first().click();
    await page.locator('input[type="time"]').first().fill('11:00');
    await page.getByRole('button', { name: /Continuar al resumen/ }).click();
    await page.getByRole('button', { name: /Crear cita/ }).click();

    await expect.poll(() => captured.post, { timeout: 10000 }).toBeTruthy();
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
    const expectedDate = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-15`;
    expect(captured.post).toEqual({
      customerId: 7,
      serviceId: 1,
      serviceIds: [1],
      appointmentDate: expectedDate,
      appointmentTime: '11:00',
      totalPrice: 22000,
    });
  });

  test('editar cita: cambiar notas → PUT con el cuerpo esperado', async ({ page }) => {
    const captured = await setup(page);
    await page.goto('/appointments?status=ALL');

    await page.locator('table tr', { hasText: 'Valentina Flores' }).getByRole('button', { name: 'Editar' }).click();
    await expect(page.getByText('Editar Cita #101')).toBeVisible();
    await page.getByPlaceholder('Observaciones, preferencias, etc...').last().fill('Prefiere tonos nude');
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();

    await expect.poll(() => captured.put, { timeout: 10000 }).toBeTruthy();
    expect(captured.put).toEqual({
      customerId: 7,
      serviceId: 1,
      serviceIds: [1],
      appointmentDate: '2030-03-14',
      appointmentTime: '10:30:00',
      status: 'CONFIRMED',
      notes: 'Prefiere tonos nude',
      totalPrice: 22000,
    });
  });
});

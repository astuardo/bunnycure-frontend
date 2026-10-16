import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Test de caracterización del listado de citas (/appointments): fija lo que la página muestra
 * con datos reales simulados, en tabla (escritorio) y tarjetas (móvil), para poder refactorizar
 * AppointmentsPage sin cambiar su comportamiento.
 */

const json = (route: Route, data: unknown) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });

const APPOINTMENTS = [
  {
    id: 101,
    appointmentDate: '2030-03-14',
    appointmentTime: '10:30:00',
    status: 'CONFIRMED',
    notes: '',
    customer: { id: 7, fullName: 'Valentina Flores', phone: '+56977665544', email: 'valentina@test.cl' },
    service: { id: 1, name: 'Manicure Rusa', price: 22000, durationMinutes: 90 },
    services: [{ id: 1, name: 'Manicure Rusa', price: 22000, durationMinutes: 90 }],
    totalPrice: 22000,
    totalDurationMinutes: 90,
    reminderSent: false,
    whatsAppConfirmationSent: true,
  },
  {
    id: 102,
    appointmentDate: '2030-03-15',
    appointmentTime: '16:00:00',
    status: 'PENDING',
    notes: '',
    customer: { id: 8, fullName: 'Camila Rojas', phone: '+56911223344', email: 'camila@test.cl' },
    service: { id: 2, name: 'Kapping Gel', price: 26000, durationMinutes: 120 },
    services: [{ id: 2, name: 'Kapping Gel', price: 26000, durationMinutes: 120 }],
    totalPrice: 26000,
    totalDurationMinutes: 120,
    reminderSent: false,
    whatsAppConfirmationSent: false,
  },
];

async function setup(page: Page) {
  await page.route('**/api/public/tenant-info*', (r) => json(r, { id: 1, name: 'BunnyCure', slug: 'bunnycure', active: true, planTier: 'PRO' }));
  await page.route('**/api/auth/me', (r) => json(r, { id: 1, username: 'admin', fullName: 'Administradora', role: 'ADMIN', enabled: true }));
  await page.route('**/api/auth/csrf', (r) => json(r, { token: 'csrf' }));
  await page.route('**/api/auth/refresh', (r) => json(r, { token: 'mock-jwt' }));
  await page.route((u) => u.pathname === '/api/appointments', (r) => json(r, APPOINTMENTS));
  await page.route((u) => u.pathname === '/api/customers' || u.pathname.startsWith('/api/customers/'), (r) => json(r, []));
  await page.route((u) => u.pathname === '/api/services' || u.pathname.startsWith('/api/services/'), (r) => json(r, []));
  await page.route((u) => u.pathname === '/api/giftcards', (r) => json(r, []));
  await page.route((u) => u.pathname.startsWith('/api/settings'), (r) => json(r, {}));
  await page.route((u) => u.pathname.startsWith('/api/stats'), (r) => json(r, {}));
}

test.describe('Listado de citas (caracterización)', () => {
  test('escritorio: la tabla muestra clienta, servicio, estado y total de cada cita', async ({ page }) => {
    test.skip(test.info().project.name !== 'Desktop Chrome', 'vista de tabla solo en escritorio');
    await setup(page);
    await page.goto('/appointments?status=ALL');

    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Mostrando/)).toContainText('2');

    const row = table.locator('tr', { hasText: 'Valentina Flores' });
    await expect(row).toContainText('Manicure Rusa');
    await expect(row).toContainText('Confirmada');
    await expect(row).toContainText('22.000');

    const pending = table.locator('tr', { hasText: 'Camila Rojas' });
    await expect(pending).toContainText('Kapping Gel');
    await expect(pending).toContainText('Pendiente');
    await expect(pending).toContainText('26.000');
  });

  test('móvil: las tarjetas muestran las mismas citas', async ({ page }) => {
    test.skip(test.info().project.name !== 'Mobile Chrome', 'vista de tarjetas solo en móvil');
    await setup(page);
    await page.goto('/appointments?status=ALL');

    await expect(page.getByText('Valentina Flores').filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Camila Rojas').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('Confirmada').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('Pendiente').filter({ visible: true }).first()).toBeVisible();
  });
});

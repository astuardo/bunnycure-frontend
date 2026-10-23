import { test, expect } from '@playwright/test';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';

// El calendario debe pedir las citas del mes que muestra (la API pagina y antes solo llegaban las
// 50 más recientes, así que los meses pasados aparecían vacíos).
test('el calendario carga las citas del mes que se está viendo', async ({ page }, info) => {
  test.skip(info.project.name !== 'Desktop Chrome', 'Un solo proyecto basta');
  const prevMonth = subMonths(new Date(), 1);
  const pastDay = format(new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 10), 'yyyy-MM-dd');
  const requests: URLSearchParams[] = [];

  await page.route((url) => url.pathname.startsWith('/api/'), (route) => {
    const url = new URL(route.request().url());
    let data: unknown = [];
    if (url.pathname === '/api/auth/me') data = { id: 1, username: 'a', fullName: 'Admin', email: 'a@a.cl', role: 'ADMIN', enabled: true };
    if (url.pathname === '/api/appointments') {
      requests.push(url.searchParams);
      const start = url.searchParams.get('startDate') ?? '';
      const end = url.searchParams.get('endDate') ?? '';
      // Solo devuelve la cita pasada si se pide un rango que la incluye
      data = start <= pastDay && pastDay <= end
        ? {
            content: [
              {
                id: 7,
                appointmentDate: pastDay,
                appointmentTime: '11:00:00',
                status: 'COMPLETED',
                customer: { id: 1, fullName: 'Camila Rojas', phone: '+56987654321' },
                service: { id: 1, name: 'Esmaltado permanente', price: 15000, durationMinutes: 60 },
                services: [{ id: 1, name: 'Esmaltado permanente', price: 15000, durationMinutes: 60 }],
              },
            ],
          }
        : { content: [] };
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data, token: 'x' }) });
  });

  await page.goto('/calendar');
  await expect(page.getByRole('button', { name: 'Mes anterior' })).toBeVisible();
  const current = requests.at(-1)!;
  expect(current.get('startDate')).toBe(format(startOfWeek(startOfMonth(new Date()), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  expect(current.get('endDate')).toBe(format(endOfWeek(endOfMonth(new Date()), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  expect(current.get('size')).toBe('5000');

  await page.getByRole('button', { name: 'Mes anterior' }).click();
  await expect.poll(() => requests.at(-1)?.get('startDate')).toBe(
    format(startOfWeek(startOfMonth(prevMonth), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  );
  await expect(page.getByText('1 cita', { exact: true })).toBeVisible();
});

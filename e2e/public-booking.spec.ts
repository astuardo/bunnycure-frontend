import { test, expect } from '@playwright/test';

test.describe('Flujo Público de Reservas (/reservar)', () => {

  test.beforeEach(async ({ page }) => {
    // Interceptar la API de servicios sin afectar los assets de Vite
    await page.route((url) => url.pathname === '/api/services', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:5173',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 1,
              name: 'Manicure Rusa con Esmaltado Permanente',
              description: 'Limpieza profunda de cutículas y esmaltado de alta duración',
              price: 22000,
              durationMinutes: 90,
              active: true,
            },
            {
              id: 2,
              name: 'Kapping Gel + Diseño Simple',
              description: 'Refuerzo de uña natural con gel constructivo',
              price: 26000,
              durationMinutes: 120,
              active: true,
            },
          ],
        }),
      });
    });
  });

  test('renderiza el catálogo público de servicios y permite seleccionar un servicio', async ({ page }) => {
    await page.goto('/reservar');

    // Esperar a que el componente lazy monte y muestre la cabecera BunnyCure
    await expect(page.getByText(/estudio de manicure & cuidado de uñas/i)).toBeVisible({ timeout: 10000 });

    // Debe mostrar la selección del paso 1
    await expect(page.getByRole('heading', { name: /selecciona el servicio que deseas/i })).toBeVisible();
    await expect(page.getByText('Manicure Rusa con Esmaltado Permanente')).toBeVisible();

    const nextButton = page.getByRole('button', { name: /continuar a fecha y hora/i });
    await expect(nextButton).toBeVisible();
    await expect(nextButton).toBeEnabled();
  });

  test('avanza por los pasos del formulario (Servicios -> Fecha y Hora -> Datos de Contacto)', async ({ page }) => {
    await page.goto('/reservar');

    // Esperar a que el componente lazy monte
    await expect(page.getByText(/estudio de manicure & cuidado de uñas/i)).toBeVisible({ timeout: 10000 });

    // Paso 1: Servicios ya cargados y primer servicio preseleccionado
    const step1Next = page.getByRole('button', { name: /continuar a fecha y hora/i });
    await expect(step1Next).toBeEnabled();
    await step1Next.click();

    // Paso 2: Selección de Fecha y Bloque Horario
    await expect(page.getByRole('heading', { name: /¿cuándo te gustaría venir\?/i })).toBeVisible();
    const step2Next = page.getByRole('button', { name: /continuar a tus datos/i });
    await expect(step2Next).toBeVisible();
    await step2Next.click();

    // Paso 3: Datos de Contacto de la Clienta
    await expect(page.getByRole('heading', { name: /tus datos de contacto/i })).toBeVisible();
    await expect(page.getByPlaceholder(/valentina gómez/i)).toBeVisible();
    await expect(page.getByPlaceholder(/8765 4321/i)).toBeVisible();
  });
});

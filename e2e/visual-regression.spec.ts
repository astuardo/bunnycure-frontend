import { test, expect } from '@playwright/test';

test.describe('Pruebas de Regresión Visual Pixel-Perfect (Visual Snapshots)', () => {

  const visualServices = [
    {
      id: 1,
      name: 'Manicure Rusa con Esmaltado Permanente',
      description: 'Limpieza profunda de cutículas con torno y esmaltado de alta duración.',
      price: 22000,
      durationMinutes: 90,
      active: true,
    },
    {
      id: 2,
      name: 'Kapping Gel + Nivelación',
      description: 'Refuerzo de uña natural con gel constructivo de alta viscosidad.',
      price: 26000,
      durationMinutes: 120,
      active: true,
    },
  ];

  test.beforeEach(async ({ page }) => {
    // Interceptar API de servicios con datos estables para evitar variabilidad visual
    await page.route((url) => url.pathname === '/api/services', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:5173',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          success: true,
          data: visualServices,
        }),
      });
    });
  });

  test('Snapshot: Pantalla de Login BunnyCure', async ({ page }) => {
    await page.goto('/login');

    // Esperar a que el formulario esté completamente cargado y las fuentes listas
    await expect(page.getByRole('heading', { name: /bunnycure/i })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    // Capturar snapshot visual de la tarjeta de login
    const loginCard = page.locator('.card');
    await expect(loginCard).toBeVisible();
    await expect(loginCard).toHaveScreenshot('login-card.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    });
  });

  test('Snapshot: Portal Público de Reservas - Paso 1 Catálogo', async ({ page }) => {
    await page.goto('/reservar');

    // Esperar a que el catálogo esté montado y las fuentes listas
    await expect(page.getByText(/estudio de manicure & cuidado de uñas/i)).toBeVisible();
    await expect(page.getByText('Manicure Rusa con Esmaltado Permanente')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    // Capturar snapshot del contenedor principal del portal
    const bookingContainer = page.locator('.container').first();
    await expect(bookingContainer).toBeVisible();
    await expect(bookingContainer).toHaveScreenshot('booking-step-1.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    });
  });

  test('Snapshot: Portal Público de Reservas - Paso 2 Horarios', async ({ page }) => {
    await page.goto('/reservar');

    await expect(page.getByText(/estudio de manicure & cuidado de uñas/i)).toBeVisible();
    await expect(page.getByText('Manicure Rusa con Esmaltado Permanente')).toBeVisible();

    const nextBtn = page.getByRole('button', { name: /continuar a fecha y hora/i });
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    await expect(page.getByRole('heading', { name: /¿cuándo te gustaría venir\?/i })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    const bookingContainer = page.locator('.container').first();
    await expect(bookingContainer).toHaveScreenshot('booking-step-2.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    });
  });
});

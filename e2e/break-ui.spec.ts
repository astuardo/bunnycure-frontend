import { test, expect } from '@playwright/test';

test.describe('Adversarial UI Stress Testing (break-ui)', () => {

  const worstCaseServices = [
    {
      id: 991,
      name: 'Kapping Gel Profesional + Tratamiento Reparador con Calcio y Vitaminas + Esmaltado Permanente con Efecto Ojo de Gato y Cristales Swarovski',
      description: 'Tratamiento intensivo con decapado suave, exfoliación botánica con sales del Himalaya, hidratación profunda con manteca de karité orgánica, alineación milimétrica de placa ungueal y sellado con top coat de diamante de alta viscosidad resistente a rayaduras.',
      price: 1250000,
      durationMinutes: 360,
      active: true,
    },
    {
      id: 992,
      name: 'Jo',
      description: '',
      price: 0,
      durationMinutes: 15,
      active: true,
    },
    {
      id: 993,
      name: 'Tratamiento_Quimico_Especial_Sin_Espacios_Para_Forzar_Desbordamiento_De_Contenedor',
      description: 'Alergia_severa_a_cianoacrilato_y_metilmetacrilato_reaccion_anafilactoide_inmediata_sin_espacios',
      price: 45000,
      durationMinutes: 45,
      active: true,
    },
  ];

  test('Paso 1 (/reservar): maneja servicios con títulos ultra-largos, precios millonarios y nombres irrompibles en 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });

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
          data: worstCaseServices,
        }),
      });
    });

    await page.goto('/reservar');
    await expect(page.getByText(/estudio de manicure & cuidado de uñas/i)).toBeVisible();

    // 1. Verificar que el precio de $1.250.000 sea visible y no se rompa
    await expect(page.getByText('$1.250.000', { exact: true })).toBeVisible();

    // 2. Verificar que no haya scroll horizontal involuntario en la página
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // 3. Evaluar integridad visual de las tarjetas de servicios (que el checkbox y el precio no se compriman a 0)
    const cardMetrics = await page.evaluate(() => {
      const cards = document.querySelectorAll('.card-body .d-flex.justify-content-between');
      const results: { text: string; priceWidth: number; priceVisible: boolean }[] = [];
      cards.forEach((card) => {
        const checkbox = card.querySelector('input[type="checkbox"]');
        const price = card.querySelector('.text-end');
        if (checkbox && price) {
          const width = price.getBoundingClientRect().width;
          results.push({
            text: (card.textContent || '').slice(0, 30),
            priceWidth: width,
            priceVisible: width > 10,
          });
        }
      });
      return results;
    });

    expect(cardMetrics.length).toBeGreaterThan(0);
    expect(cardMetrics.every((c) => c.priceVisible)).toBe(true);
  });

  test('Paso 3 (/reservar): maneja datos extremos de clienta (nombres internacionales, email corporativo largo, emoji)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

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
          data: [worstCaseServices[0]],
        }),
      });
    });

    await page.goto('/reservar');
    await expect(page.getByText(/estudio de manicure & cuidado de uñas/i)).toBeVisible();

    // Avanzar a Paso 2
    const step1Next = page.getByRole('button', { name: /continuar a fecha y hora/i });
    await expect(step1Next).toBeEnabled();
    await step1Next.click();

    // Avanzar a Paso 3
    const step2Next = page.getByRole('button', { name: /continuar a tus datos/i });
    await expect(step2Next).toBeVisible();
    await step2Next.click();

    // Ingresar datos extremos en Paso 3
    const nameInput = page.getByPlaceholder(/valentina gómez/i);
    const phoneInput = page.getByPlaceholder(/8765 4321/i);
    const emailInput = page.getByPlaceholder(/ejemplo@correo.com/i).or(page.locator('input[type="email"]'));

    await nameInput.fill('Aleksandra Wiśniewska-Kowalczyk');
    await phoneInput.fill('+56 9 8765 4321');
    if (await emailInput.count() > 0) {
      await emailInput.fill('bartholomew.fitzgerald@northwind-industries-holdings.example.com');
    }

    // Verificar que los inputs mantengan sus valores íntegros
    await expect(nameInput).toHaveValue('Aleksandra Wiśniewska-Kowalczyk');
    await expect(phoneInput).toHaveValue('+56 9 8765 4321');

    // Verificar que no se rompa el layout
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });

  test('Paso 1 (/reservar): caso límite con catálogo vacío (0 servicios)', async ({ page }) => {
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
          data: [],
        }),
      });
    });

    await page.goto('/reservar');
    await expect(page.getByText(/estudio de manicure & cuidado de uñas/i)).toBeVisible();

    // Mensaje de estado vacío
    await expect(page.getByText(/no hay servicios disponibles en este momento/i)).toBeVisible();

    // El botón debe estar deshabilitado
    const nextBtn = page.getByRole('button', { name: /continuar a fecha y hora/i });
    await expect(nextBtn).toBeDisabled();
  });
});

import { test, expect, Page } from '@playwright/test';

// Mock helper para simular usuario autenticado en endpoints protegidos
async function setupAuthenticatedSession(page: Page) {
  // Mock tenant-info
  await page.route('**/api/public/tenant-info*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          tenantId: 'default',
          salonName: 'BunnyCure',
        },
      }),
    });
  });

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 1,
          username: 'admin',
          fullName: 'Administradora Bunny',
          email: 'admin@bunnycure.cl',
          role: 'ADMIN',
          enabled: true,
        },
      }),
    });
  });

  await page.route('**/api/auth/csrf', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, token: 'mock-csrf' }),
    });
  });

  // Solo interceptar llamadas directas a la API y NUNCA archivos TypeScript/Vite
  await page.route((url) => url.pathname === '/api/appointments' || url.pathname.startsWith('/api/appointments/'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.route((url) => url.pathname === '/api/customers' || url.pathname.startsWith('/api/customers/'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.route((url) => url.pathname === '/api/services' || url.pathname.startsWith('/api/services/'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.route((url) => url.pathname === '/api/settings' || url.pathname.startsWith('/api/settings/'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          businessName: 'BunnyCure',
          rut: '76.123.456-7',
          address: 'Providencia 1234',
          email: 'contacto@bunnycure.cl',
          phone: '+56912345678',
        },
      }),
    });
  });

  await page.route((url) => url.pathname === '/api/stats' || url.pathname.startsWith('/api/stats/'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {} }),
    });
  });

  // La sesión se recupera desde la cookie HttpOnly de refresh (el access token vive solo en memoria)
  await page.route('**/api/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { token: 'mock-valid-jwt-token' } }),
    });
  });

  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
  page.on('requestfailed', (req) => console.log('REQ FAILED:', req.url(), req.failure()?.errorText));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
  });
}

test.describe('Pruebas Integrales de Diseño y Responsividad: Móvil vs PC', () => {

  const mobileViewports = [
    { name: 'iPhone SE (375x667)', width: 375, height: 667 },
    { name: 'iPhone 14 (390x844)', width: 390, height: 844 },
    { name: 'Android Compact (360x800)', width: 360, height: 800 },
  ];

  const desktopViewports = [
    { name: 'Laptop HD (1280x800)', width: 1280, height: 800 },
    { name: 'Full HD (1920x1080)', width: 1920, height: 1080 },
  ];

  // ─────────────────────────────────────────────────────────────
  // 1. PRUEBAS EN MÓVIL
  // ─────────────────────────────────────────────────────────────
  for (const vp of mobileViewports) {
    test.describe(`Dispositivo Móvil: ${vp.name}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test('Página de Login: No tiene desbordamiento horizontal y los headers se adaptan', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(hasOverflow).toBe(false);

        await expect(page.getByRole('heading', { name: /bunnycure/i })).toBeVisible();
      });

      test('Portal Público de Reservas (/reservar): Sin desbordamiento lateral', async ({ page }) => {
        await page.goto('/reservar');
        await page.waitForLoadState('networkidle');

        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(hasOverflow).toBe(false);
      });

      test('Navbar autenticado: Hamburguesa visible, buscador compacto y sin desbordamiento horizontal', async ({ page }) => {
        await setupAuthenticatedSession(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Botón hamburguesa debe ser visible en el header móvil
        const menuBtn = page.getByRole('button', { name: /abrir menú/i });
        await expect(menuBtn).toBeVisible();

        // El buscador no debe romper el ancho de pantalla
        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(hasOverflow).toBe(false);

        // Al pulsar el menú hamburguesa, se despliega el drawer
        await menuBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible();

        // Al volver a pulsar el botón en el header, el drawer se esconde
        const toggleBtn = page.getByRole('button', { name: /cerrar menú/i }).first();
        await toggleBtn.click();
        await expect(page.getByRole('dialog')).toBeHidden();
      });

      test('Calendario (/calendar): Cabecera adaptada, celdas compactas y sin scroll horizontal', async ({ page }) => {
        await setupAuthenticatedSession(page);
        await page.goto('/calendar');
        await page.waitForLoadState('networkidle');

        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(hasOverflow).toBe(false);

        await expect(page.getByRole('button', { name: /mes anterior/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /mes siguiente/i })).toBeVisible();
      });

      test('Gestión de Citas (/appointments): Márgenes respirables y sin overflow', async ({ page }) => {
        await setupAuthenticatedSession(page);
        await page.goto('/appointments');
        await page.waitForLoadState('networkidle');

        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(hasOverflow).toBe(false);

        await expect(page.getByRole('heading', { name: /gestión de citas/i })).toBeVisible();
      });

      test('Clientes (/customers): Header y pestañas adaptadas sin desborde', async ({ page }) => {
        await setupAuthenticatedSession(page);
        await page.goto('/customers');
        await page.waitForLoadState('networkidle');

        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(hasOverflow).toBe(false);
      });

      test('Configuración (/settings): Pestañas envuelven adecuadamente y contenido alineado', async ({ page }) => {
        await setupAuthenticatedSession(page);
        await page.goto('/settings');
        await page.waitForLoadState('networkidle');

        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(hasOverflow).toBe(false);
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 2. PRUEBAS EN PC / ESCRITORIO
  // ─────────────────────────────────────────────────────────────
  for (const vp of desktopViewports) {
    test.describe(`Escritorio PC: ${vp.name}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test('Página de Login en PC: Centrado estético y sin overflow', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(hasOverflow).toBe(false);
        await expect(page.getByRole('heading', { name: /bunnycure/i })).toBeVisible();
      });

      test('Dashboard en PC: Sidebar fijo desplegado y hamburguesa móvil oculta', async ({ page }) => {
        await setupAuthenticatedSession(page);
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        const menuBtn = page.getByRole('button', { name: /abrir menú/i });
        await expect(menuBtn).toBeHidden();

        await expect(page.getByText('Ctrl+K')).toBeVisible();

        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(hasOverflow).toBe(false);

        // Sidebar con contención de overscroll para evitar desplazamiento accidental de la página
        const sidebarOverscroll = await page.locator('aside').evaluate((el) => {
          return window.getComputedStyle(el).overscrollBehavior;
        });
        expect(sidebarOverscroll).toContain('contain');
      });

      test('Calendario en PC: Cuadrícula completa de 7 días y navegación alineada', async ({ page }) => {
        await setupAuthenticatedSession(page);
        await page.goto('/calendar');
        await page.waitForLoadState('networkidle');

        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(hasOverflow).toBe(false);

        await expect(page.getByRole('heading', { name: /calendario de citas/i })).toBeVisible();
      });
    });
  }
});

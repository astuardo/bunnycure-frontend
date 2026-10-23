import { test, expect, Page, CDPSession } from '@playwright/test';

// Navegación móvil: barra superior fija al hacer scroll y gestos desde el borde izquierdo
// (abrir/cerrar el menú, volver en pantallas de detalle). Solo en el proyecto táctil.

async function mockSession(page: Page) {
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path === '/api/auth/me') {
      data = { id: 1, username: 'admin', fullName: 'Administradora Demo', email: 'admin@bunnycure.cl', role: 'ADMIN', enabled: true };
    } else if (path === '/api/auth/csrf') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, token: 'mock' }) });
    } else if (path.startsWith('/api/settings') || path.startsWith('/api/public/tenant') || path.startsWith('/api/tenant')) {
      data = { name: 'Salón Demo', businessName: 'Salón Demo', slug: 'demo' };
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
  });
}

async function swipe(cdp: CDPSession, from: { x: number; y: number }, to: { x: number; y: number }, steps = 8) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  for (let i = 1; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test.describe('Navegación móvil', () => {
  test.skip(({ isMobile }) => !isMobile, 'Gestos táctiles: solo proyecto móvil');

  test('la barra superior queda visible al bajar', async ({ page }) => {
    await mockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.mouse.wheel(0, 1500);
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(300);
    const nav = page.locator('nav').first();
    const box = await nav.boundingBox();
    expect(box?.y ?? -1).toBeGreaterThanOrEqual(-1);
    expect(box?.y ?? 99).toBeLessThanOrEqual(1);
    await expect(page.getByRole('button', { name: /abrir menú/i })).toBeInViewport();
  });

  // Caso reportado: Inicio -> Citas y deslizar desde el borde volvía atrás Y abría el menú.
  test('deslizar desde el borde vuelve a la pantalla anterior y nunca abre el menú', async ({ page }) => {
    await mockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Citas' }).click();
    await expect(page).toHaveURL(/\/appointments/);
    // La pantalla de Citas se carga en diferido: el gesto se prueba cuando ya está montada
    await expect(page.getByRole('heading', { name: 'Citas' })).toBeVisible();
    const cdp = await page.context().newCDPSession(page);

    await swipe(cdp, { x: 6, y: 400 }, { x: 220, y: 404 });
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.waitForTimeout(400);
    await expect(page.getByRole('dialog', { name: 'Menú' })).toBeHidden();
  });

  test('en la primera pantalla (sin anterior) el gesto no hace nada', async ({ page }) => {
    await mockSession(page);
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');
    const cdp = await page.context().newCDPSession(page);

    await swipe(cdp, { x: 6, y: 400 }, { x: 220, y: 404 });
    await page.waitForTimeout(400);
    await expect(page).toHaveURL(/\/appointments/);
    await expect(page.getByRole('dialog', { name: 'Menú' })).toBeHidden();
  });

  test('una ficha abierta directo por enlace vuelve a su listado', async ({ page }) => {
    await mockSession(page);
    await page.goto('/customers/1');
    await page.waitForLoadState('networkidle');
    const cdp = await page.context().newCDPSession(page);

    await swipe(cdp, { x: 6, y: 400 }, { x: 200, y: 404 });
    await expect(page).toHaveURL(/\/customers$/);
  });

  test('el menú se abre con su botón y se cierra deslizando a la izquierda', async ({ page }) => {
    await mockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const cdp = await page.context().newCDPSession(page);

    await page.getByRole('button', { name: /abrir menú/i }).click();
    await expect(page.getByRole('dialog', { name: 'Menú' })).toBeVisible();
    await page.waitForTimeout(350);
    await swipe(cdp, { x: 240, y: 400 }, { x: 20, y: 402 });
    await expect(page.getByRole('dialog', { name: 'Menú' })).toBeHidden();
  });

  test('un arrastre a medias no cierra el menú ni lo vuelve a animar', async ({ page }) => {
    await mockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const cdp = await page.context().newCDPSession(page);

    await page.getByRole('button', { name: /abrir menú/i }).click();
    await page.waitForTimeout(350);
    await swipe(cdp, { x: 240, y: 400 }, { x: 215, y: 401 }, 4);
    await page.waitForTimeout(300);
    const panel = page.getByRole('dialog', { name: 'Menú' }).locator('> div').nth(1);
    await expect(panel).not.toHaveClass(/animate-drawer-in/);
    expect((await panel.boundingBox())!.x).toBeGreaterThanOrEqual(-1);
  });

  test('un scroll vertical cerca del borde no navega', async ({ page }) => {
    await mockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Citas' }).click();
    const cdp = await page.context().newCDPSession(page);

    await swipe(cdp, { x: 8, y: 600 }, { x: 30, y: 200 });
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/appointments/);
  });

  test('el "deslizar para volver" propio del navegador está desactivado', async ({ page }) => {
    await mockSession(page);
    await page.goto('/dashboard');
    const overscroll = await page.evaluate(() => getComputedStyle(document.documentElement).overscrollBehaviorX);
    expect(overscroll).toBe('none');
  });

  test('pestañas inferiores: navegan y "Más" abre el menú completo', async ({ page }) => {
    await mockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const tabs = page.getByRole('navigation', { name: 'Navegación principal' });
    await expect(tabs).toBeVisible();

    await tabs.getByRole('link', { name: 'Citas' }).click();
    await expect(page).toHaveURL(/\/appointments/);
    await expect(tabs.getByRole('link', { name: 'Citas' })).toHaveClass(/text-bunny-primary/);

    // El contenido no queda tapado: el último elemento de la página termina sobre la barra
    const barTop = (await tabs.boundingBox())!.y;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const mainBottom = await page.evaluate(() => {
      const kids = [...document.querySelectorAll('main > *')];
      return Math.max(...kids.map((k) => k.getBoundingClientRect().bottom));
    });
    expect(mainBottom).toBeLessThanOrEqual(barTop + 1);

    await tabs.getByRole('button', { name: 'Más' }).click();
    await expect(page.getByRole('dialog', { name: 'Menú' })).toBeVisible();
  });
});

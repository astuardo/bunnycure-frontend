import { test, expect } from '@playwright/test';

test.describe('Calidad Visual y Ergonomía Móvil (mobile-native)', () => {

  test('no tiene scroll horizontal no deseado en vista móvil (390px)', async ({ page }) => {
    // Configurar viewport móvil
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');

    // Verificar que el ancho de scroll no supere el viewport
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });

  test('los inputs de texto previenen el zoom accidental de iOS (font-size >= 16px)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');

    const usernameInput = page.getByPlaceholder(/ingresa tu usuario/i);
    await expect(usernameInput).toBeVisible();

    const fontSize = await usernameInput.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });

    // En iOS Safari, font-size < 16px dispara zoom automático involuntario
    expect(fontSize).toBeGreaterThanOrEqual(16);
  });
});

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

  test('incluye directivas nativas en meta viewport y theme-color adaptativo', async ({ page }) => {
    await page.goto('/login');

    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportMeta).toContain('viewport-fit=cover');
    expect(viewportMeta).toContain('interactive-widget=resizes-content');

    const lightThemeColor = await page.locator('meta[name="theme-color"][media*="light"]').getAttribute('content');
    expect(lightThemeColor).toBeTruthy();
  });

  test('los botones y enlaces poseen ergonomía táctil (touch-action manipulation y sin tap-highlight)', async ({ page }) => {
    await page.goto('/login');

    const button = page.getByRole('button', { name: /iniciar sesión/i });
    await expect(button).toBeVisible();

    const touchAction = await button.evaluate((el) => window.getComputedStyle(el).touchAction);
    expect(touchAction).toBe('manipulation');

    const tapHighlight = await page.evaluate(() => {
      return window.getComputedStyle(document.documentElement).webkitTapHighlightColor;
    });
    // Debe ser transparente o rgba(0, 0, 0, 0)
    expect(tapHighlight).toMatch(/(transparent|rgba\(0,\s*0,\s*0,\s*0\))/i);
  });

  test('los modales aplican diseño Bottom Sheet en vista móvil (<768px)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');

    const bottomSheetStyles = await page.evaluate(() => {
      const dialog = document.createElement('div');
      dialog.className = 'modal-dialog';
      const content = document.createElement('div');
      content.className = 'modal-content';
      dialog.appendChild(content);
      document.body.appendChild(dialog);

      const dialogStyle = window.getComputedStyle(dialog);
      const contentStyle = window.getComputedStyle(content);

      const result = {
        alignItems: dialogStyle.alignItems,
        borderTopLeftRadius: contentStyle.borderTopLeftRadius,
        borderBottomLeftRadius: contentStyle.borderBottomLeftRadius,
      };
      document.body.removeChild(dialog);
      return result;
    });

    // En pantallas móviles se ancla abajo y tiene esquinas superiores redondeadas
    expect(bottomSheetStyles.alignItems).toBe('flex-end');
    expect(parseFloat(bottomSheetStyles.borderTopLeftRadius)).toBeGreaterThanOrEqual(20);
    expect(parseFloat(bottomSheetStyles.borderBottomLeftRadius)).toBe(0);
  });
});

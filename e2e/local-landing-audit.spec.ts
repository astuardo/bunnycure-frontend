import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const ARTIFACTS_DIR = 'C:/Users/alfre/.gemini/antigravity-ide/brain/6a630742-457d-4c04-bc8e-19a44e95022a';

test.describe('Auditoría Integral de Rediseño de Landing Page Bunny Cure', () => {
  test('audita el rediseño local en http://localhost:3005', async ({ page }, testInfo) => {
    test.setTimeout(45000);

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    console.log('Navegando a http://localhost:3005 ...');
    await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Esperar a que el loader se oculte
    const loader = page.locator('#loader');
    if (await loader.count() > 0) {
      await loader.waitFor({ state: 'hidden', timeout: 6000 }).catch(() => {});
    }

    await page.waitForTimeout(1500);

    // 1. Título y meta
    const title = await page.title();
    console.log('Título:', title);
    expect(title).toContain('Bunny Cure');

    // 2. Comprobar que no hay errores de consola
    console.log('Errores de consola:', consoleErrors);
    expect(consoleErrors.length).toBe(0);

    // 3. Comprobar enlaces de reserva
    const bookingLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links
        .filter((a) => {
          const href = a.getAttribute('href') || '';
          return href.includes('reservar.bunnycure.cl');
        })
        .map((a) => a.innerText.trim());
    });
    console.log(`Enlaces directos a reservar.bunnycure.cl encontrados: ${bookingLinks.length}`);
    expect(bookingLinks.length).toBeGreaterThan(5);

    // 4. Capturas de pantalla
    const isMobile = testInfo.project.name.toLowerCase().includes('mobile');
    const prefix = isMobile ? 'mobile' : 'desktop';

    const heroShot = path.join(ARTIFACTS_DIR, `bunnycure_redesigned_${prefix}_hero.png`);
    await page.screenshot({ path: heroShot, fullPage: false });

    const fullShot = path.join(ARTIFACTS_DIR, `bunnycure_redesigned_${prefix}_full.png`);
    await page.screenshot({ path: fullShot, fullPage: true });

    // 5. Reporte JSON
    const report = {
      project: testInfo.project.name,
      title,
      bookingLinksCount: bookingLinks.length,
      consoleErrors,
      heroShot,
      fullShot,
    };
    fs.writeFileSync(path.join(ARTIFACTS_DIR, `bunnycure_redesigned_${prefix}.json`), JSON.stringify(report, null, 2));

    console.log(`Auditoría de rediseño ${prefix} finalizada con éxito.`);
  });
});

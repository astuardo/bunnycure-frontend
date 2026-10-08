import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const ARTIFACTS_DIR = 'C:/Users/alfre/.gemini/antigravity-ide/brain/6a630742-457d-4c04-bc8e-19a44e95022a';

test.describe('Auditoría Integral en Vivo de www.bunnycure.cl', () => {
  test('audita la landing page en vivo, captura pantallas y revisa enlaces', async ({ page }, testInfo) => {
    test.setTimeout(60000);

    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('requestfailed', (req) => {
      failedRequests.push(`${req.url()} (${req.failure()?.errorText})`);
    });

    console.log('Navegando a https://www.bunnycure.cl ...');
    await page.goto('https://www.bunnycure.cl', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Esperar a que el loader se oculte si existe
    const loader = page.locator('#loader');
    if (await loader.count() > 0) {
      await loader.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    }

    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // 1. Datos básicos SEO
    const title = await page.title();
    console.log('Título:', title);

    // 2. Revisar enlaces clave de agendamiento
    const bookingLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links
        .filter((a) => {
          const txt = (a.innerText || a.textContent || '').toLowerCase();
          const href = (a.getAttribute('href') || '').toLowerCase();
          return txt.includes('agend') || txt.includes('reserv') || href.includes('wa.me') || href.includes('whatsapp') || href.includes('reserva');
        })
        .map((a) => ({
          text: a.innerText.trim(),
          href: a.getAttribute('href'),
        }));
    });
    console.log('Enlaces de agendamiento encontrados:', JSON.stringify(bookingLinks, null, 2));

    // 3. Capturas de pantalla
    const isMobile = testInfo.project.name.toLowerCase().includes('mobile');
    const prefix = isMobile ? 'mobile' : 'desktop';

    // Captura del Hero
    const heroShot = path.join(ARTIFACTS_DIR, `bunnycure_live_${prefix}_hero.png`);
    await page.screenshot({ path: heroShot, fullPage: false });

    // Captura de página completa
    const fullShot = path.join(ARTIFACTS_DIR, `bunnycure_live_${prefix}_full.png`);
    await page.screenshot({ path: fullShot, fullPage: true });

    // 4. Reporte de diagnóstico
    const auditReport = {
      project: testInfo.project.name,
      title,
      bookingLinks,
      consoleErrors,
      failedRequests,
      heroScreenshot: heroShot,
      fullScreenshot: fullShot,
    };

    const reportPath = path.join(ARTIFACTS_DIR, `bunnycure_audit_${prefix}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2));

    console.log(`Auditoría ${prefix} completada con éxito.`);
    expect(title).toContain('Bunny');
  });
});

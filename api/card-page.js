import fs from 'fs';
import path from 'path';

let cachedBaseHtml = null;

export default async function handler(req, res) {
  const { publicId = '' } = req.query || {};
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'app.bunnycure.cl';
  const proto = req.headers['x-forwarded-proto'] || 'https';

  let firstName = 'Club';
  let customerName = '';

  // 1. Obtener datos de la tarjeta desde el backend de BunnyCure
  if (publicId) {
    try {
      const apiRes = await fetch(`https://api.bunnycure.cl/api/public/loyalty-card/${publicId}`, {
        headers: { Accept: 'application/json' },
      });
      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json?.data?.firstName) {
          firstName = json.data.firstName.trim();
          customerName = (json.data.customerName || firstName).trim();
        }
      }
    } catch {
      // Si falla la consulta, se mantiene el fallback 'Club'
    }
  }

  // 2. Obtener el HTML base compilado (de dist/index.html o vía fetch al host)
  let baseHtml = cachedBaseHtml;
  if (!baseHtml) {
    try {
      const distPath = path.join(process.cwd(), 'dist', 'index.html');
      if (fs.existsSync(distPath)) {
        baseHtml = fs.readFileSync(distPath, 'utf-8');
      }
    } catch {
      // Ignorar error de filesystem
    }
  }

  if (!baseHtml) {
    try {
      const htmlRes = await fetch(`${proto}://${host}/index.html`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (htmlRes.ok) {
        baseHtml = await htmlRes.text();
        cachedBaseHtml = baseHtml;
      }
    } catch {
      // Fallback
    }
  }

  if (!baseHtml) {
    // Si no se puede obtener el template, redirigir a la SPA normal
    return res.redirect(302, `/`);
  }

  const cardTitle = firstName && firstName !== 'Club' ? `Bunny Pass - ${firstName}` : 'Bunny Pass Club';
  const cardUrl = `${proto}://${host}/mi-tarjeta/${publicId}`;
  const manifestUrl = `/manifest-card.json?id=${encodeURIComponent(publicId)}&name=${encodeURIComponent(firstName)}`;

  // 3. Inyectar metadatos en el HTML estático para que iOS Safari y Android Chrome los lean desde el primer byte
  let modifiedHtml = baseHtml;

  // Limpiar cualquier script legado de sincronización temprana si existiera
  modifiedHtml = modifiedHtml.replace(/<!-- Early Card PWA Manifest & Canonical Synchronizer -->[\s\S]*?<\/script>/gi, '');

  // Reemplazar <title>
  if (modifiedHtml.includes('<title>')) {
    modifiedHtml = modifiedHtml.replace(/<title>.*?<\/title>/gi, `<title>${cardTitle}</title>`);
  }

  // Reemplazar o inyectar meta title
  const metaTitle = `<meta name="title" content="${cardTitle}" />`;
  if (/name=["']title["']/i.test(modifiedHtml)) {
    modifiedHtml = modifiedHtml.replace(/<meta[^>]*name=["']title["'][^>]*\/?>/gi, metaTitle);
  } else {
    modifiedHtml = modifiedHtml.replace('</head>', `  ${metaTitle}\n  </head>`);
  }

  // Reemplazar o inyectar meta tags de Apple y PWA
  const metaAppleTitle = `<meta name="apple-mobile-web-app-title" content="${cardTitle}" />`;
  if (/name=["']apple-mobile-web-app-title["']/i.test(modifiedHtml)) {
    modifiedHtml = modifiedHtml.replace(/<meta[^>]*name=["']apple-mobile-web-app-title["'][^>]*\/?>/gi, metaAppleTitle);
  } else {
    modifiedHtml = modifiedHtml.replace('</head>', `  ${metaAppleTitle}\n  </head>`);
  }

  const metaAppName = `<meta name="application-name" content="${cardTitle}" />`;
  if (/name=["']application-name["']/i.test(modifiedHtml)) {
    modifiedHtml = modifiedHtml.replace(/<meta[^>]*name=["']application-name["'][^>]*\/?>/gi, metaAppName);
  } else {
    modifiedHtml = modifiedHtml.replace('</head>', `  ${metaAppName}\n  </head>`);
  }

  // Open Graph & Twitter meta tags para compatibilidad máxima en previews y anclados
  const ogTags = [
    `<meta property="og:title" content="${cardTitle}" />`,
    `<meta property="og:url" content="${cardUrl}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${cardTitle}" />`,
  ].join('\n  ');
  modifiedHtml = modifiedHtml.replace('</head>', `  ${ogTags}\n  </head>`);

  // Reemplazar o inyectar el manifest específico de la tarjeta
  const linkManifest = `<link rel="manifest" href="${manifestUrl}" />`;
  if (/rel=["']manifest["']/i.test(modifiedHtml)) {
    modifiedHtml = modifiedHtml.replace(/<link[^>]*rel=["']manifest["'][^>]*\/?>/gi, linkManifest);
  } else {
    modifiedHtml = modifiedHtml.replace('</head>', `  ${linkManifest}\n  </head>`);
  }

  // Reemplazar o inyectar la URL canónica
  const linkCanonical = `<link rel="canonical" href="${cardUrl}" />`;
  if (/rel=["']canonical["']/i.test(modifiedHtml)) {
    modifiedHtml = modifiedHtml.replace(/<link[^>]*rel=["']canonical["'][^>]*\/?>/gi, linkCanonical);
  } else {
    modifiedHtml = modifiedHtml.replace('</head>', `  ${linkCanonical}\n  </head>`);
  }

  // Inyectar persistencia anticipada en localStorage para accesos directos
  const inlineStorageScript = `<script>try{localStorage.setItem('bunny_my_loyalty_public_id','${publicId}')}catch(e){}</script>`;
  modifiedHtml = modifiedHtml.replace('<head>', `<head>\n  ${inlineStorageScript}`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  return res.status(200).send(modifiedHtml);
}

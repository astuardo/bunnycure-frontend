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

  // Reemplazar <title>
  if (modifiedHtml.includes('<title>')) {
    modifiedHtml = modifiedHtml.replace(/<title>.*?<\/title>/i, `<title>${cardTitle}</title>`);
  }

  // Reemplazar o inyectar meta tags de Apple y PWA
  const metaAppleTitle = `<meta name="apple-mobile-web-app-title" content="${cardTitle}" />`;
  if (/name="apple-mobile-web-app-title"/i.test(modifiedHtml)) {
    modifiedHtml = modifiedHtml.replace(/<meta[^>]*name="apple-mobile-web-app-title"[^>]*\/?>/i, metaAppleTitle);
  } else {
    modifiedHtml = modifiedHtml.replace('</head>', `  ${metaAppleTitle}\n  </head>`);
  }

  const metaAppName = `<meta name="application-name" content="${cardTitle}" />`;
  if (/name="application-name"/i.test(modifiedHtml)) {
    modifiedHtml = modifiedHtml.replace(/<meta[^>]*name="application-name"[^>]*\/?>/i, metaAppName);
  } else {
    modifiedHtml = modifiedHtml.replace('</head>', `  ${metaAppName}\n  </head>`);
  }

  // Reemplazar o inyectar el manifest específico de la tarjeta
  const linkManifest = `<link rel="manifest" href="${manifestUrl}" />`;
  if (/rel="manifest"/i.test(modifiedHtml)) {
    modifiedHtml = modifiedHtml.replace(/<link[^>]*rel="manifest"[^>]*\/?>/i, linkManifest);
  } else {
    modifiedHtml = modifiedHtml.replace('</head>', `  ${linkManifest}\n  </head>`);
  }

  // Reemplazar o inyectar la URL canónica
  const linkCanonical = `<link rel="canonical" href="${cardUrl}" />`;
  if (/rel="canonical"/i.test(modifiedHtml)) {
    modifiedHtml = modifiedHtml.replace(/<link[^>]*rel="canonical"[^>]*\/?>/i, linkCanonical);
  } else {
    modifiedHtml = modifiedHtml.replace('</head>', `  ${linkCanonical}\n  </head>`);
  }

  // Inyectar persistencia anticipada en localStorage para accesos directos
  const inlineStorageScript = `<script>try{localStorage.setItem('bunny_my_loyalty_public_id','${publicId}')}catch(e){}</script>`;
  modifiedHtml = modifiedHtml.replace('<head>', `<head>\n  ${inlineStorageScript}`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
  return res.status(200).send(modifiedHtml);
}

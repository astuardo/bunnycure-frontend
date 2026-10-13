export default function handler(req, res) {
  const { id = '', name = 'Club' } = req.query || {};
  let firstName = 'Club';
  try {
    firstName = decodeURIComponent(name || 'Club');
  } catch {
    firstName = name || 'Club';
  }
  const cardPath = id ? `/mi-tarjeta/${id}` : '/';

  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');

  return res.status(200).json({
    id: cardPath,
    name: `Bunny Pass - ${firstName}`,
    short_name: 'Bunny Pass',
    description: `Tarjeta de fidelización digital BunnyCure Club de ${firstName}`,
    theme_color: '#FDFCF8',
    background_color: '#FDFCF8',
    scope: '/',
    start_url: cardPath,
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  });
}

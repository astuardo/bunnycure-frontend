@echo off
echo ========================================
echo Copiando iconos definitivos a public/
echo ========================================
echo.

cd /d "%~dp0public"

echo Copiando iconos Android para PWA...
copy appstore-images\android\launchericon-192x192.png icon-192.png
copy appstore-images\android\launchericon-512x512.png icon-512.png
copy appstore-images\android\launchericon-512x512.png icon-maskable-512.png

echo.
echo Copiando icono iOS para Apple...
copy appstore-images\ios\180.png apple-touch-icon.png

echo.
echo Copiando favicons...
copy appstore-images\ios\32.png favicon-32x32.png
copy appstore-images\ios\16.png favicon-16x16.png

echo.
echo ========================================
echo Iconos copiados exitosamente!
echo ========================================
echo.
echo Ahora actualiza:
echo 1. manifest.json (cambiar .svg a .png)
echo 2. vite.config.ts (cambiar .svg a .png)
echo 3. index.html (links a nuevos favicons)
echo.
echo Luego ejecuta: npm run build
echo.
pause

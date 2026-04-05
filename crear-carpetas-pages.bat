@echo off
echo Creando estructura de carpetas para páginas...

cd /d "%~dp0"
cd src\pages

if not exist "appointments" mkdir appointments
if not exist "customers" mkdir customers
if not exist "services" mkdir services
if not exist "booking-requests" mkdir booking-requests

echo.
echo ✅ Carpetas creadas:
echo    - src\pages\appointments\
echo    - src\pages\customers\
echo    - src\pages\services\
echo    - src\pages\booking-requests\
echo.
echo Listo!

@echo off
echo Creando estructura de carpetas para Layout...

cd /d "%~dp0"
cd src\components

if not exist "layout" mkdir layout

echo.
echo ✅ Carpetas creadas:
echo    - src\components\layout\
echo.
echo Listo para crear componentes de layout!
pause

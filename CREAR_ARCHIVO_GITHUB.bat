@echo off
cd /d "%~dp0"
echo ================================================
echo   INFORME DE ESTACA - BARRIOS Y SEMAFORO MOVIL
echo ================================================
echo.
where py >nul 2>nul
if %errorlevel% == 0 (
  py -3 "GENERAR_REEMPLAZO.py"
) else (
  python "GENERAR_REEMPLAZO.py"
)
if errorlevel 1 (
  echo.
  echo No se pudo generar el archivo. Revisa el error de arriba.
  pause
  exit /b 1
)
echo.
echo Abriendo carpeta con archivo listo para GitHub...
explorer "%~dp0LISTO_PARA_GITHUB\app"
pause

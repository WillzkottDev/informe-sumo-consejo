@echo off
setlocal
cd /d "%~dp0"
set "destino=LISTO_PARA_GITHUB"
for %%d in (app lib db drizzle public dist) do (
  robocopy "%%d" "%destino%\%%d" /E /NFL /NDL /NJH /NJS /NP >nul
  if errorlevel 8 goto :fallo
)
for %%f in (portal-client.tsx vite.config.ts wrangler-sumo-consejo.json MAPA-DE-VISTAS.md LEEME.txt CREAR_ARCHIVO_GITHUB.bat) do (
  copy /y "%%f" "%destino%\%%f" >nul
  if errorlevel 1 goto :fallo
)
echo Archivos preparados en %destino%. Sigue los pasos de LEEME.txt para aplicar la actualizacion de D1.
explorer "%~dp0%destino%"
pause
exit /b 0
:fallo
echo No se pudo completar la copia. Revisa la ubicacion y el espacio disponible.
pause
exit /b 1

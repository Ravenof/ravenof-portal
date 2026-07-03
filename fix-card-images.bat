@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

rem Service role key: is env arba .env.local; jei nera - paklausiam
findstr /b "SUPABASE_SERVICE_ROLE_KEY=" .env.local >nul 2>&1
if errorlevel 1 if "%SUPABASE_SERVICE_ROLE_KEY%"=="" (
  echo Service role key rasi: Supabase Dashboard - Settings - API - service_role
  set /p SUPABASE_SERVICE_ROLE_KEY=Iklijuok SUPABASE_SERVICE_ROLE_KEY:
)

rem sharp - tik pirma karta
if not exist node_modules\sharp call npm i --no-save sharp

echo.
echo === 1/2: Dry-run ataskaita ===
node tools\fix-card-images.mjs
echo.
set /p FIXNOW=Taisyti dabar? (y/n):
if /i "%FIXNOW%"=="y" node tools\fix-card-images.mjs --fix
pause

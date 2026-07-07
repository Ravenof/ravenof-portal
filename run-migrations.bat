@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo ============================================
echo  Ravenof migraciju paleidimas (20260810-20260829)
echo ============================================
echo.
echo DATABASE_URL rasi: Supabase Dashboard - Connect - Connection String
echo Pasirink "Session pooler", Type: URI, pakeisk [YOUR-PASSWORD].
echo Atrodo: postgresql://postgres.xxxx:SLAPTAZODIS@aws-0-...pooler.supabase.com:5432/postgres
echo.
set /p DATABASE_URL="Iklijuok DATABASE_URL ir spausk Enter: "
if "%DATABASE_URL%"=="" (
  echo Nieko neivesta - nutraukiam.
  pause
  exit /b 1
)
echo.
echo === Idiegiam pg (jei dar nera; nekeicia package.json) ===
call npm i --no-save pg
echo.
node tools\run-migrations.mjs
echo.
pause

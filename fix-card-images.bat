@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

findstr /b "SUPABASE_SERVICE_ROLE_KEY=" .env.local >nul 2>&1
if not errorlevel 1 goto haskey
if not "%SUPABASE_SERVICE_ROLE_KEY%"=="" goto haskey
echo Service role key rasi: Supabase Dashboard - Settings - API - service_role
set /p SUPABASE_SERVICE_ROLE_KEY=Iklijuok SUPABASE_SERVICE_ROLE_KEY:
:haskey

if not exist node_modules\sharp call npm i --no-save sharp

echo === 1/2: Dry-run ataskaita ===
node tools\fix-card-images.mjs %* > tools\img-scan.log 2>&1
type tools\img-scan.log
echo.
set /p FIXNOW=Taisyti dabar? (y/n):
if /i "%FIXNOW%"=="y" (
  node tools\fix-card-images.mjs --fix %* > tools\img-fix.log 2>&1
  type tools\img-fix.log
)
pause

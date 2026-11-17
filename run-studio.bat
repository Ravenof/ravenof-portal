@echo off
rem == Ravenof studija: parduotuves ekrano nuotraukos + kovos vaizdo irasai ==
rem Rezultatai: store-media\shots\lt, store-media\shots\en, store-media\video
setlocal
cd /d "%~dp0"
if "%E2E_TEST_EMAIL%"=="" set /p E2E_TEST_EMAIL=Zaidimo paskyros el. pastas: 
if "%E2E_TEST_PASSWORD%"=="" set /p E2E_TEST_PASSWORD=Slaptazodis: 
call npm i -D @playwright/test --no-save
call npx playwright install chromium
call npx playwright test --config playwright.studio.config.ts %*
echo.
echo Baigta. Failai: store-media\shots ir store-media\video

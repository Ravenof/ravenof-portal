@echo off
setlocal
cd /d "%~dp0"
echo ── Ravenof E2E (Playwright) ──
if "%E2E_TEST_EMAIL%"=="" set /p E2E_TEST_EMAIL=E2E_TEST_EMAIL: 
if "%E2E_TEST_PASSWORD%"=="" set /p E2E_TEST_PASSWORD=E2E_TEST_PASSWORD: 
call npm i -D @playwright/test --no-save
call npx playwright install chromium
call npx playwright test %*
echo Ataskaita: npx playwright show-report
pause

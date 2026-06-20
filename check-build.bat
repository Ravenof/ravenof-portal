@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === TypeScript tikrinimas ===
call npx tsc --noEmit
echo === ESLint ===
call npm run lint
echo === Next build ===
call npm run build
echo.
echo ====== BAIGTA ======
pause

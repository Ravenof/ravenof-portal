@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/app/digital/layout.tsx
git add src/components/digital/DigitalHub.tsx
git add src/components/digital/ui/HubKit.tsx
git add git-commit386.bat
echo === Commit ===
git commit -m "style(icons): padidinti ikonu dydziai - segmentai 26->46, valiutos 16->22, kovos rezimai 22->30, bottom nav 24->30."
echo === Push ===
git push
echo.
echo ============= BAIGTA. =============
pause

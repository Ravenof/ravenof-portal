@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/app/digital/layout.tsx
git add git-commit389.bat
echo === Commit ===
git commit -m "style(nav): bottom nav ikonos - is silueto (brightness0) i invert(0.92), kad islaikytu detale bet butu sviesios ant tamsaus fono. Aktyvi = auksine. (Tavo nav ikonos tamsios detalios -> silueto blob'ai buvo blogai.)"
echo === Push ===
git push
echo.
echo ============= BAIGTA. =============
pause

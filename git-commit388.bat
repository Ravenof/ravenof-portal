@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/components/digital/ui/RvnIcon.tsx
git add git-commit388.bat
echo === Commit ===
git commit -m "fix(icons): cache-busting ?v=3 prie ikonu URL. Priezastis kodel nav/fi rode fallback - WebView uzkesave sena 404 (ikonos prasytos pries idedant failus); seg/cur veike nes nauji slot'ai. Dabar visos ikonos fetch'inamos is naujo. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. =============
pause

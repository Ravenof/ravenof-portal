@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

echo === 1. Salinamas stale git lock (jei yra) ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === 2. Stage'inami pakeitimai ===
git add -u

echo === 3. Commit ===
git commit -m "fix(atlas): ivykiu eraIndex pagal era_slug lookup (rodydavo 0 ivykiu, nesimatė keliones linijos), atradimu skaitiklis 🧭 X/Y headeryje"

echo === 4. Push ===
git push

echo.
echo === BAIGTA. Spauskite bet kuri klavisa. ===
pause

@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

echo === 1. Salinamas stale git lock (jei yra) ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === 2. Stage'inami pakeitimai ===
git add public/playtest/table-wood.jpg
git add -u

echo === 3. Commit ===
git commit -m "fix(playtest): long-press atsaukiamas prasidejus drag (nebera popup tempiant), dragEnd ignoruojamas po apziuros; taverno stalo fonas (mediena + zvakiu sviesa + vinjete)"

echo === 4. Push ===
git push

echo.
echo === BAIGTA. Spauskite bet kuri klavisa. ===
pause

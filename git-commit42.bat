@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

echo === 1. Salinamas stale git lock (jei yra) ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === 2. Stage'inami pakeitimai ===
git add -u

echo === 3. Commit ===
git commit -m "fix(rules): prakeiksmu rework (be kainos, atskira 10-20 side deck, imaisymas tik per efektus), coin flip nebe goblinu restrikcija; suvienodinti retumu pavadinimai, pasalinta tuscia Reakcijos kategorija, typo/formuluociu pataisymai"

echo === 4. Push ===
git push

echo.
echo === BAIGTA. Spauskite bet kuri klavisa. ===
pause

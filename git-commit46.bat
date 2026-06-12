@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

echo === 1. Salinamas stale git lock (jei yra) ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === 2. Stage'inami pakeitimai ===
git add src/components/tutorial/TutorialGame.tsx
git add git-commit46.bat
git add -u

echo === 3. Commit ===
git commit -m "fix(tutorial): pop-up centravimas - framer-motion perrasydavo translateX(-50%%), pakeista i left-0 right-0 mx-auto (zingsniai, patarimai, toast, uzuominos, ZMK chip)"

echo === 4. Push ===
git push

echo.
echo === BAIGTA. Spauskite bet kuri klavisa. ===
pause

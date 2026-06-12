@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

echo === 1. Salinamas stale git lock (jei yra) ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === 2. Stage'inami pakeitimai ===
git add src/lib/tutorial/engine.ts
git add src/lib/tutorial/ai.ts
git add src/lib/tutorial/ambient.ts
git add src/lib/tutorial/script.ts
git add src/components/tutorial/TutorialGame.tsx
git add src/components/tutorial/TutorialButton.tsx
git add git-commit44.bat
git add -u

echo === 3. Commit ===
git commit -m "feat(tutorial): mokomoji kova 'Ismokyk mane zaisti' - pilnas zaidimo varikliukas pagal taisykles (fazes, auksas, ZMK, raktazodziai, busenos, cempionai, reakcijos, lauko kortos, prakeiksmai), AI oponentas, vedamas pop-up scenarijus + mechaniku patarimai, sintezuota dark fantasy ambient muzika, mygtukai Mano kaladese ir bendruomenes kaladese"

echo === 4. Push ===
git push

echo.
echo === BAIGTA. Spauskite bet kuri klavisa. ===
pause

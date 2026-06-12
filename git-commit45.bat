@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

echo === 1. Salinamas stale git lock (jei yra) ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === 2. Stage'inami pakeitimai ===
git add src/components/tutorial/TutorialGame.tsx
git add src/components/tutorial/TutorialButton.tsx
git add src/components/rules/RulesPageClient.tsx
git add git-commit45.bat
git add -u

echo === 3. Commit ===
git commit -m "fix(tutorial): pop-up'ai mobile ekrane kaip bottom sheet (telpa, scrollinami) + 'Ismokyk mane zaisti' mygtukas taisykliu puslapyje su demo kalade is aktyviu DB kortu"

echo === 4. Push ===
git push

echo.
echo === BAIGTA. Spauskite bet kuri klavisa. ===
pause

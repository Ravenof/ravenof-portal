@echo off
cd /d "%~dp0"
git add src/components/tutorial/TutorialGame.tsx src/components/digital/ranked/RankedResult.tsx src/locales/lt/battle.json src/locales/en/battle.json git-commit675.bat
git commit -m "Celebration-style result screens for PvE, friendly PvP (stats strip) and ranked (rank ceremony), win + loss variants"
git push
pause

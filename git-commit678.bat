@echo off
cd /d "%~dp0"
git add src/components/tutorial/TutorialGame.tsx src/components/digital/ranked/RankedResult.tsx src/components/digital/progression/RewardCelebration.tsx src/locales/lt/battle.json src/locales/en/battle.json git-commit678.bat
git commit -m "Result screens: scrollable panel (buttons always reachable), compact achievement chips (max 6 + N)"
git push
pause

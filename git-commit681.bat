@echo off
cd /d "%~dp0"
git add src/components/tutorial/TutorialGame.tsx src/components/digital/ranked/RankedResult.tsx src/components/digital/progression/RewardCelebration.tsx git-commit681.bat
git commit -m "Match result screens: compact landscape-phone layout (short viewport) so buttons always fit; side-by-side stats/achievements/level bar, smaller tiles, touch scrolling"
git push
pause

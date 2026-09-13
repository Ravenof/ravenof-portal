@echo off
cd /d "%~dp0"
git add src/components/tutorial/TutorialGame.tsx src/components/digital/progression/RewardCelebration.tsx src/lib/rewards/rewardVisuals.ts git-commit674.bat
git commit -m "Match result screen in celebration style (rays, embers, reward tiles with count-up, red tone on defeat)"
git push
pause

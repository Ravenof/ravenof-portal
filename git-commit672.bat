@echo off
cd /d "%~dp0"
git add src/components/digital/progression/RewardCelebration.tsx src/components/digital/progression/LoginRewardsScreen.tsx src/components/digital/progression/DailyQuestsScreen.tsx src/components/digital/progression/SeasonPathScreen.tsx src/components/digital/progression/ChoiceModals.tsx src/components/digital/DigitalHub.tsx src/components/digital/ranked/RankedResult.tsx src/components/tutorial/TutorialGame.tsx src/app/digital/layout.tsx src/locales/lt/rewards.json src/locales/en/rewards.json git-commit672.bat
git commit -m "Reward celebration screen (login/quests/chest/season/card/booster), match result + level-up + ranked result scaled for desktop"
git push
pause

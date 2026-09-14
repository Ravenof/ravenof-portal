@echo off
cd /d "%~dp0"
git add supabase/migrations/20260914_login_month_reset_pack_choice.sql src/lib/progression/types.ts src/lib/progression/client.ts src/components/digital/progression/ChoiceModals.tsx src/components/digital/progression/RewardCelebration.tsx src/components/digital/progression/LoginRewardsScreen.tsx src/locales/lt/progression.json src/locales/en/progression.json src/locales/lt/rewards.json src/locales/en/rewards.json git-commit676.bat
git commit -m "Login rewards: calendar-month cycle (resets on the 1st, last day = finale), bigger desktop calendar; booster choice = pick one of the active shop packs (added to inventory)"
git push
pause

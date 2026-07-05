@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add supabase/migrations/20260811_level_rewards.sql
git add src/lib/economy.ts
git add git-commit373.bat
echo === Commit ===
git commit -m "feat(economy phase2a): config-driven account level rewards + claims. migr 20260811: economy_config.level_rewards (kas lvl 100 Sidabras+25 Esencija; kas5 +pak/300/100; kas10 +2pak/500/200/50rub; lvl20 rare pak/750/300/rare card back; lvl50 legendary card back/3pak/1000/500/100rub); user_level_reward_claims (idempotencija); BACKFILL esamiems lygiams be dvigubo; rvn__level_reward_payload + rvn__check_level_rewards; rvn_report_match_v2 dabar grazina levelRewards sventei. Esamo rvn_report_match/20260804 NELIETA. economy.ts: LevelRewardEntry tipas. tsc svarus. TutorialGame wiring = 2b."
echo === Push ===
git push
echo.
echo ============= BAIGTA. =============
pause

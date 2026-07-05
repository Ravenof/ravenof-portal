@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add supabase/migrations/20260810_economy_foundation.sql
git add src/lib/economy.ts
git add git-commit371.bat
echo === Commit ===
git commit -m "feat(economy phase1): PAMATAS - valiutos + reward_transactions + config-driven match rewards. migr 20260810: profiles += rubies/essence (gold=Sidabras); reward_transactions logas; economy_config (match_rewards/validity/streak, admin redaguos); user_inventory; matches (validumas+idempotencija client_match_id); rvn__grant_reward_payload (vienas variklis: currency/account_xp/season_xp/item -> loguoja); rvn_report_match_v2 (bot/unranked/ranked, validumas, dienos cap, ranked win streak; NEliecia esamo rvn_report_match). economy.ts: getBalances + reportMatchV2 + tipai. tsc svarus. Wiring i TutorialGame/UI - kita faze."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause

@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add supabase/migrations/20260623_ranked_fixes.sql src/components/digital/ranked/RankedClient.tsx src/app/admin/ranked/RankedAdminClient.tsx git-commit184.bat
git commit -m "fix(ranked): match-report klaida - xp_transactions CHECK tvarkingai apima ranked_* (be tylaus exception), saugesnis last_opponent_ids + array castai, klaidos zinute rodoma UI; feat: botu tarpusavio kovu simuliacija (rvn_simulate_bot_matches) generuoja K/D ir judina ranga - 2 k./d. per pg_cron + lazy-cron (rvn_maybe_simulate_bot_matches kvieciama atidarius Ranked, >=11h) + admin mygtukas"
git push
) > commit184.log 2>&1

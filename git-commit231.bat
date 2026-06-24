@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/digital/StoreModal.tsx supabase/migrations/20260701_daily_deal_9cards.sql git-commit231.bat
git commit -m "feat(shop): parduotuve perdaryta nuo nulio (svari, fiksuoto px aukscio plyteles - jokio overlap) + dienos kortos dabar 9 (booster slotu 2-10 retumo logika, praleidziant 1-a korta, is visu frakciju, deterministiska per diena)"
git push
) > commit231.log 2>&1

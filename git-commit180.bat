@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add supabase/migrations/20260620_ranked_mode.sql supabase/migrations/20260621_ranked_bots_from_zero.sql src/components/tutorial/TutorialGame.tsx src/components/digital/ranked/RankedClient.tsx src/app/admin/ranked/RankedAdminClient.tsx git-commit180.bat
git commit -m "fix(ranked): botai pradeda nuo 0 (50 Bronza) ir laiptus pasistato per rvn_simulate_bot_ladder (admin mygtukas); ranked kova nebenaudoja tutorial rezimo (practice+ranked) - rodo priesininka ir antraste 'Reitingo kova pries X', be tutorial popupu; ranked botas pagalvoja 5-20s atsitiktinai pries ejima, 0.7-1.5s tarp veiksmu"
git push
) > commit180.log 2>&1

@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add supabase/migrations/20260818_ranked_daily.sql
git add src/lib/economy.ts
git add src/components/tutorial/TutorialGame.tsx
git add git-commit382.bat
echo === Commit ===
git commit -m "feat(economy): ranked kovos irasomos i matches (daily-task progresui). migr 20260818: rvn_record_ranked_match (TIK matches eilute mode=ranked + validumas; JOKIO ekonomikos atlygio - ranked atlygi tvarko esama rvn_report_ranked_match; be dvigubo). economy.ts recordRankedMatch. TutorialGame rankedReportedRef efektas irasi ranked matcha -> daily task trigeris progresuoja win_ranked/play_ranked/play_match/win_match. Idempotentiska. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. =============
pause

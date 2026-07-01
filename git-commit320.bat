@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add supabase/migrations/20260803_match_rewards.sql
git add src/lib/economy.ts
git add src/components/tutorial/TutorialGame.tsx
git add git-commit320.bat
echo === Commit ===
git commit -m "feat(retention #3): kovos atlygio + level-up sventes ekranas. 20260803: xp_transactions CHECK + 'match' saltinis; rvn_report_match(won,mode) skiria skaluota XP (pvp 60/20, hard 45/12, normal 25/8, easy 15/5) i xp_transactions -> bazinis trigeris atnaujina xp_total/level; grazina totalBefore/After (greatest apsauga). economy.ts: reportMatchXp helper. TutorialGame: kovai pasibaigus (ne demo/ranked/campaign) skiria XP; pergales/pralaimejimo modale rodo +auksas / +XP chips, animuota XP juosta (before->after) ir 'NAUJAS LYGIS N' banner + sekmes garsas kai persokamas slenkstis. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause

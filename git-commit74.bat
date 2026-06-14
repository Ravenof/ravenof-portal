@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add supabase/migrations/20260613_champion_family.sql src/lib/tutorial/engine.ts src/components/tutorial/TutorialGame.tsx src/components/admin/CardForm.tsx src/app/admin/cards/actions.ts "src/app/admin/cards/[cardId]/page.tsx" git-commit74.bat
git commit -m "feat(champions): champion_group + champion_phase laukai (DB+modelis) ir grieztas faziu tikrinimas - phase2/3 reikia tos pacios seimos cempiono ankstesneje fazeje; admin laukai cempionams"
git push
) > commit74.log 2>&1

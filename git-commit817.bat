@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/cosmetics.ts src/components/tutorial/TutorialGame.tsx src/app/admin/shop/AdminShopClient.tsx src/lib/version.ts public/avatars/v2 supabase/migrations/20261120e_avatars_v2_pilot.sql git-commit817.bat
git commit -m "817: avataru overhaul pradzia - nauji veidai wounded ir smug, priartinimo centras, Nekronautas + Korvas + Zariju kalvis + Sutarciu ragana + Vyriausiasis teisejas + Gelezine sesuo + Kapu giedotoja + Marso bugnininkas + Stygu mage + Tylos mokinys (migracija 20261120e)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit817.log 2>&1

@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/app/digital/layout.tsx src/lib/digital/cosmeticsStore.ts src/lib/cosmetics.ts src/components/tutorial/TutorialGame.tsx src/lib/rewards/rewardVisuals.ts src/components/digital/profile/ProfileCosmeticsModal.tsx src/lib/version.ts public/card-backs/v2 supabase/migrations/20261120d_card_backs_v2.sql git-commit815.bat git-commit816.bat
git commit -m "816: naujas kortu nugareliu rinkinys (numatytoji + 8), senos isimamos (migracija 20261120d); parduotuve uzsidaro paspaudus meniu punkta" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit816.log 2>&1

@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add supabase/migrations/20261128b_prestige_card_back.sql src/lib/version.ts src/components/digital/ui/LevelEmblem.tsx src/components/digital/profile/AccountLevelScreen.tsx src/components/digital/profile/ProfileCosmeticsModal.tsx public/card-backs/v2/cb-prestizas.webp public/ravenof-ui/levels git-commit849.bat
git commit -m "849: tikros paskyros lygiu emblemos (10 pakopu ir Prestizas) vietoj laikinu, nauja Prestizo nugarele 50 lygio atlygiui" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2p52WXEcLzrz9fWNLQ"
git push
git log -1 --oneline
) > commit849.log 2>&1

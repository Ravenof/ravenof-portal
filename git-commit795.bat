@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/economy.ts src/lib/starterDecks.ts src/lib/version.ts git-commit795.bat
git commit -m "795: startiniu kaladziu deziuciu ir boosteriu paveiksleliai pagal kalba (content_translations image_url EN variantas)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2roVTLcAdN84CcY8er"
git push
git log -1 --oneline
) > commit795.log 2>&1

@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add apps/digital/src/UpdateLayer.tsx src/lib/version.ts git-commit832.bat
git commit -m "832: atnaujinimo ekranas - besikeiciancios linksmos eilutes, juostos blizgesys, logo svytejimas ir centravimas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2q4xKtxDCTMeqeaDnr"
git push
git log -1 --oneline
) > commit832.log 2>&1

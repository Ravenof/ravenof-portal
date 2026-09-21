@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/cards/legend.ts src/components/tutorial/TutorialGame.tsx src/locales/lt/battle.json src/locales/en/battle.json src/lib/version.ts git-commit712.bat
git commit -m "712: kortos apziura - is legendos pasalintas Pagalbinis zenkliukas (ir burto tipas rodomas tik burtams), pridetas kortos zurnalas skirtuke: gyva busena is lentos + kas nutiko BUTENT siai kortai" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_015TLWcibxvH546P5Uog8kPs"
git push
git log -1 --oneline
) > commit712.log 2>&1

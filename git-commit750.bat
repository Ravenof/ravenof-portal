@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/tutorial/TutorialGame.tsx src/lib/version.ts git-commit750.bat
git commit -m "750: PvP svecias/stebetojas vel mato ZMK traukimus (viaScene ZMK be vietines scenos rodo iprasta traukima); APP_VERSION 750" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_012iT93Xhj9mfT32n14mwSpR"
git push
git log -1 --oneline
) > commit750.log 2>&1

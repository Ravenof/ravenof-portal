@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/tutorial/TutorialGame.tsx src/lib/tutorial/engine.ts src/locales/lt/battle.json src/locales/en/battle.json src/lib/version.ts git-commit751.bat
git commit -m "751: PvP - efektu pasirinkimo langus mato ir sprendzia tik pats rinkejas (priesininkas nebemato ir negali rinkti uz ji), priesininkui rodoma Priesininkas renkasi; APP_VERSION 751" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_012iT93Xhj9mfT32n14mwSpR"
git push
git log -1 --oneline
) > commit751.log 2>&1

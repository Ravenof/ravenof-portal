@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/tutorial/TutorialGame.tsx src/lib/tutorial/engine.ts src/lib/version.ts scripts/simulate-pvp-guest-choices.ts git-commit752.bat
git commit -m "752: PvP - svecias (player 2) pats renkasi efektu pasirinkimus ir taikinius (iskvietimas, burtas i ranka, ARBA, kopija, perziura, Kovos suksnis, Paskutinis noras); host priima tik savo puses sprendimus; APP_VERSION 752" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_012iT93Xhj9mfT32n14mwSpR"
git push
git log -1 --oneline
) > commit752.log 2>&1

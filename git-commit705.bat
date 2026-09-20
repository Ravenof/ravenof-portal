@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/tutorial/KeywordFxLayer.tsx src/components/tutorial/TutorialGame.tsx src/lib/game/timing.ts src/app/dev/keyword-fx/page.tsx src/locales/lt/battle.json src/locales/en/battle.json ravenof-fx-preview-keywords.html src/lib/version.ts git-commit705.bat
git commit -m "705: ZMK korta skrenda is modifikatoriu kalades i taikini ir laikoma 0.5s ilgiau (2.5s) + nauji raktazodziu FX (Kovos suksnis / Paskutinis noras / Trigeris) su antspaudu, pirmas kartas pilnas, veliau kompaktas; /dev/keyword-fx perziura" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_015TLWcibxvH546P5Uog8kPs"
git push
git log -1 --oneline
) > commit705.log 2>&1

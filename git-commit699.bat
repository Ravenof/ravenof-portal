@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/cards/legend.ts src/components/tutorial/TutorialGame.tsx src/locales/lt/battle.json src/locales/en/battle.json src/lib/version.ts git-commit699.bat
git commit -m "699: kortos legenda - tipas, raktazodziai, visi trigger'iai ir efektu tipu zenkliukai (be kainos/ATK/HP)"
git push
git log -1 --oneline
) > commit699.log 2>&1

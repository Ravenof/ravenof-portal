@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/cosmetics.ts src/components/digital/PackOpen.tsx src/components/tutorial/TutorialGame.tsx src/locales/lt/battle.json src/locales/en/battle.json src/lib/version.ts git-commit713.bat
git commit -m "713: BUILD FIX - itraukti 711 failai (cosmetics.ts randomBotCardBack + PackOpen nugarele), kuriu 712 commitas neapeme; kortos zurnalas rodomas be skirtuko - busena ir ivykiai virsuje, legenda apacioje (laikant pele skirtuko paspausti negalima)" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_015TLWcibxvH546P5Uog8kPs"
git push
git log -1 --oneline
) > commit713.log 2>&1

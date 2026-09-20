@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/tutorial/KeywordFxLayer.tsx src/components/tutorial/TutorialGame.tsx src/lib/game/timing.ts src/app/dev/keyword-fx/page.tsx src/locales/lt/battle.json src/locales/en/battle.json ravenof-fx-preview-keywords.html src/lib/version.ts git-commit705.bat git-commit706.bat
git commit -m "706: ZMK - nugarele atskrenda is kalades, flip ties taikiniu, rezultatas 1.5s ir TIK TADA zala; raktazodziu (kovos suksnis/paskutinis noras/trigeris) vienoda chronologija: saltinis -> nukreipimas -> pavadinimas PRIE TAIKINIO 2s -> zala; /dev/keyword-fx" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_015TLWcibxvH546P5Uog8kPs"
git push
git log -1 --oneline
) > commit706.log 2>&1

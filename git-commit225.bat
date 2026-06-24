@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/lib/game/types.ts src/lib/game/effectEngine.ts git-commit225.bat
git commit -m "feat(engine): naujas efektas Suteikti Sprinta (grant sprint keyword) - veikia su targetSummoned (Ramturas iskviestam padarui suteikia sprinta -> gali atakuoti is karto)"
git push
) > commit225.log 2>&1

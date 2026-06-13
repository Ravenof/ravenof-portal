@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit65.bat
git commit -m "fix(game mobile): rankos traukimo animacija tik vertikali (nebekelia horizontalaus scroll); isjungtas teksto zymejimas/iOS callout zaidimo lange (select-none + WebkitTouchCallout none)"
git push
) > commit65.log 2>&1

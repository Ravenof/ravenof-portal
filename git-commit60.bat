@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit60.bat
git commit -m "fix(game): ZMK auto flash padarytas fiksuotu centruotu overlay - matomas ir mobile (anksciau absolute -top-24 iseidavo uz ekrano)"
git push
) > commit60.log 2>&1

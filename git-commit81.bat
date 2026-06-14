@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit81.bat
git commit -m "fix(practice): prieso frakcijos uzklausa .or -> .in (grazindavo 0 kortu -> mirror); isjungti tutorial patarimai (queueTip) praktikos rezime"
git push
) > commit81.log 2>&1

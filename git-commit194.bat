@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit194.bat
git commit -m "fix(fx): pilno lauko AoE animacija pasileidzia jau nuo 2 taikiniu (isk. zaidejo pasirinktus), aoeMode slenkstis 3->2"
git push
) > commit194.log 2>&1

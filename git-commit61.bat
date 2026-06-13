@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit61.bat
git commit -m "feat(game): logas pertvarkytas i event+card srauta (irgi burtai/prakeiksmai, su hover/long-press apziurai); ZMK flash rodo VISAS traukimo kortas greta (puolancio ir gynejo) su skirtingomis reiksmemis ir puses zyme"
git push
) > commit61.log 2>&1

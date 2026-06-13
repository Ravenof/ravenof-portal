@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit53.bat
git commit -m "feat(game): suzaistu kortu log juosta su miniaturomis - hover (PC) rodo perziura, paspaudus/long-press atveria detalu korta; abieju pusiu suzaistos kortos"
git push
) > commit53.log 2>&1

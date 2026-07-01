@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit316.bat
git commit -m "fix(pvp/mobile): prieso avataras + valdymo juosta. PvP: paimam TIKRA priesininko equipped avatara (is jo profilio equipped_avatar), ne default - abu mato tikrus. Mobile: 'Baigti ejima' perkeltas VIRS gold (kaireje kolonoje: baigti/auksas/parduoti); pile'ai desineje. Suskleistas log strip sutrumpintas iki paskutiniu 3 kortu + uzdetas remas. tsc svarus."
git push
) > commit316.log 2>&1

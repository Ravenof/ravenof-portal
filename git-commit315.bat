@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit315.bat
git commit -m "fix(avatars): miniaturos video grazinta prie veikiancios struktura. Video PAKEICIA portreta (kaip detailed view, kuris groja), be force-play/onError/opacity gating kurie sukeldavo mirksejima. autoPlay muted playsInline + onLoadedData->onVid + onEnded->revert/reschedule. tsc svarus."
git push
) > commit315.log 2>&1

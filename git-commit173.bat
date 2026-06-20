@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit173.bat
git commit -m "feat(hp): musio HP vial - didesnis fantasy potion butelys (kamstis, skystis, blikai) su sirdeles ikona ir HP skaiciumi virsuje; spalva pagal HP, <10 sirdele pulsuoja"
git push
) > commit173.log 2>&1

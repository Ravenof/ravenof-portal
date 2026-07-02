@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/digital/StoreModal.tsx git-commit230.bat
git commit -m "fix(shop): plyteliu persidengimas - fiksuotas px aukstis (height:250) ant button vietoj aspect-ratio. Priezastis: % aukstis (aspect-ratio/padding) nesizuoja CSS Grid auto-track, track liko 81px ir overflow-hidden button prie jo prikirpdavo. Validuota gyvai narsykleje"
git push
) > commit230.log 2>&1

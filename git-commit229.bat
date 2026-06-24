@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/digital/StoreModal.tsx git-commit229.bat
git commit -m "fix(shop): plyteliu aukstis - aspectRatio grazintas ant paties button (kaip veikusi aspect-square) + h-full vaikai, vietoj child padding-top kuris luzo del button-kaip-flex quirk. object-contain islaikytas"
git push
) > commit229.log 2>&1

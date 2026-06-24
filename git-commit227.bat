@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/digital/StoreModal.tsx git-commit227.bat
git commit -m "fix(shop): prekiu plyteles nebesioverlapina - vietoj Tailwind arbitrary aspect-[3/4] (negeneruojama buildo) naudojamas inline aspectRatio paveikslo zonai + natural flow (be h-full grandines)"
git push
) > commit227.log 2>&1

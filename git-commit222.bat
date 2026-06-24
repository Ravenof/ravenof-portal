@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add public/card-backs/back.webp public/card-backs/curse.webp public/card-backs/zmk.webp public/icons/icon-192.png public/icons/icon-512.png public/icons/maskable-512.png public/icons/apple-touch-icon.png public/favicon.ico src/app/layout.tsx git-commit222.bat
git commit -m "feat(brand): naujos kortu nugareles (back/curse/zmk webp) + naujas Ravenof logo kaip app ikona/favicon/PWA splash (pakeicia R raide): icon-192/512, maskable-512 (safe-zone), apple-touch-icon, favicon.ico"
git push
) > commit222.log 2>&1

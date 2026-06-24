@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/digital/StoreModal.tsx git-commit228.bat
git commit -m "fix(shop): plyteliu auksctis per padding-top triuka (aspect-ratio CSS neveike webview - plyteles buvo plokscios). Dabar paveikslo zona 120%% portretas, kortos tilpsta, plyteles tvarkingos"
git push
) > commit228.log 2>&1

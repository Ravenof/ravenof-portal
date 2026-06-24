@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/market/MarketClient.tsx git-commit237.bat
git commit -m "feat(market): kortos full-size (object-contain, auksctesnes plyteles, ne cropped); pardavejo vardas paspaudziamas -> jo stalas (filtras pagal pardaveja + banner); long-press ant kortos -> detali peržiura per CardLightbox"
git push
) > commit237.log 2>&1

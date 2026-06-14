@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
del /f /q _cv.png _cost_tiles.png _sheet_test.png 2>nul
(
git add scripts/update_cards_atk_hp.sql git-commit69.bat
git commit -m "data(cards): ATK/HP UPDATE 253 kuriniams - istraukta automatiskai is teksto sluoksnio pagal pozicija (kaire=ATK, desine=HP)"
git push
) > commit69.log 2>&1

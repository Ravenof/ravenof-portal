@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
del /f /q _sheet_test.png _cardprev_d1.png _cardprev_g1.png _top.png _bot.png 2>nul
(
git add scripts/seed_cards_import.sql git-commit67.bat
git commit -m "data(cards): baseline seed SQL 400 kortu (vardas/frakcija/tipas/efektas/image_url, status active); paleisti po TRUNCATE"
git push
) > commit67.log 2>&1

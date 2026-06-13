@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
del /f /q _cardprev_d1.png _cardprev_g1.png _top.png _bot.png 2>nul
(
git add public/cards scripts/cards_import_data.json scripts/import_cards.py git-commit66.bat
git commit -m "assets(cards): atvaizduoti visi 400 kortu PDF i optimizuotus webp (public/cards/<frakcija>), + teksto duomenu JSON (vardas/efektas/numeris) ir importo skriptas"
git push
) > commit66.log 2>&1

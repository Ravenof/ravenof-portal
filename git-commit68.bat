@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add scripts/seed_cards_import.sql git-commit68.bat
git commit -m "fix(seed): unikalus card_number su frakcijos prefiksu (cards_card_number_unique), URL-encoded image_url (tarpai/+), tipas is failo vardo (curse/field/champion/artifact), is_champion cempionams"
git push
) > commit68.log 2>&1

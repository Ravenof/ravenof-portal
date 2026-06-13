@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/deck-builder/DeckListPanel.tsx src/components/deck-builder/SaveDeckButton.tsx git-commit55.bat
git commit -m "fix(deck-builder): side deck rodomas toje pacioje scroll srityje kaip main deck (nebeuzgozia); save klaida rodo tikra prieztasti + nuoroda i migracija jei truksta is_side_deck"
git push
) > commit55.log 2>&1

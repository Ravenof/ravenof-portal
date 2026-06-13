@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1

taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"

(
git add src/lib/deck-validation.ts src/stores/deckBuilderStore.ts src/components/deck-builder/DeckCardPool.tsx src/components/deck-builder/DeckCardRow.tsx src/components/deck-builder/DeckListPanel.tsx src/components/deck-builder/SaveDeckButton.tsx "src/app/deck-builder/[deckId]/page.tsx" src/app/deck-builder/DeckBuilderClient.tsx git-commit52.bat git-commit52b.bat
git commit -m "feat(deck-builder): atskiras prakeiksmu side deck - curse kortos i side deck (maks 20); store sideEntries, validacija, UI sekcija, save/load is_side_deck"
git push
) > commit52.log 2>&1

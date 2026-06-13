@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

if exist ".git\index.lock" del /f /q ".git\index.lock"

git add src/lib/deck-validation.ts
git add src/stores/deckBuilderStore.ts
git add src/components/deck-builder/DeckCardPool.tsx
git add src/components/deck-builder/DeckCardRow.tsx
git add src/components/deck-builder/DeckListPanel.tsx
git add src/components/deck-builder/SaveDeckButton.tsx
git add "src/app/deck-builder/[deckId]/page.tsx"
git add src/app/deck-builder/DeckBuilderClient.tsx
git add git-commit52.bat

git commit -m "feat(deck-builder): atskiras prakeiksmu side deck - curse kortos nebededamos i main deck, o i side deck (maks 20); store sideEntries, validacija, UI sekcija, save/load is_side_deck"

git push

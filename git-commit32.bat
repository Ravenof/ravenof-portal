@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

echo === 1. Salinamas stale git lock (jei yra) ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === 2. Stage'inami pakeitimai ===
git add src/lib/ui-sound.ts
git add src/components/ui/GameCard.tsx
git add src/components/ui/GlobalSoundToggle.tsx
git add src/components/cards/CardItem.tsx
git add "src/app/cards/[cardNumber]/page.tsx"
git add src/app/life-tracker/LifeTrackerClient.tsx
git add src/components/deck-builder/DeckCardPool.tsx
git add src/components/layout/HeaderNav.tsx
git add src/stores/deckBuilderStore.ts

echo === 3. Commit ===
git commit -m "feat(game-feel): GameCard 3D tilt+shine+press fizika, globalus UI garso variklis (ui-sound.ts), garso jungiklis header'yje, deck-builder garsai, life-tracker migruotas i globalu garsa"

echo === 4. Push ===
git push

echo.
echo === BAIGTA. Spauskite bet kuri klavisa. ===
pause

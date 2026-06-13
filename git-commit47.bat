@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

echo === 1. Salinamas stale git lock (jei yra) ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === 2. Stage'inami pakeitimai ===
git add supabase/gameplay_v1.sql
git add src/lib/game
git add src/lib/tutorial/engine.ts
git add src/components/tutorial/TutorialGame.tsx
git add src/components/admin/GameplayConfigEditor.tsx
git add src/components/admin/CardForm.tsx
git add src/app/admin/zmk
git add src/app/admin/cards/actions.ts
git add "src/app/admin/cards/[cardId]/page.tsx"
git add src/app/admin/page.tsx
git add scripts/simulate-virtual-game.ts
git add public/sounds/battle/README.md
git add VIRTUAL-GAME-NOTES.md
git add git-commit47.bat
git add -u

echo === 3. Commit ===
git commit -m "feat(gameplay): virtualaus zaidimo v1 - effect engine su admin mappingu (cards.gameplay), target/trigger resolveriai, curse side deck, ZMK is DB (auto/draw), field pasyvai+triggeriai, projectile animacijos, battle sound manager, targeting cursor, hand zoom, desktop scale, tutorial fallback+collapse, admin ZMK CRUD + gameplay editorius, 29 simuliaciniai testai"

echo === 4. Push ===
git push

echo.
echo === BAIGTA. Spauskite bet kuri klavisa. ===
pause

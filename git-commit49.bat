@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

echo === 1. Salinamas stale git lock (jei yra) ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === 2. Stage'inami pakeitimai ===
git add src/lib/game/types.ts
git add src/lib/game/effectEngine.ts
git add src/lib/tutorial/engine.ts
git add src/components/admin/GameplayConfigEditor.tsx
git add git-commit49.bat

echo === 3. Commit ===
git commit -m "feat(gameplay): naujas efektas removeZmkCard - pasalina nurodyta ZMK korta (pvz -2) is savo/prieso kalades iki zaidimo pabaigos; types + effectEngine + engine primityvas + admin editoriaus ZMK reiksmes/savininko pasirinkimas"

echo === 4. Push ===
git push

echo.
echo === BAIGTA. Spauskite bet kuri klavisa. ===
pause

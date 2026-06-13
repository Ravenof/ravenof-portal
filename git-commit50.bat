@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

if exist ".git\index.lock" del /f /q ".git\index.lock"

git add src/lib/game/types.ts
git add src/lib/tutorial/engine.ts
git add src/components/admin/GameplayConfigEditor.tsx
git add git-commit50.bat

git commit -m "feat(gameplay): pasyvi aura passiveAura.enemyUnitDamageHealsOwner - visa zala prieso padarams pridedama prie auros savininko HP (dealToUnit leech), types + admin checkbox"

git push

echo.
echo === BAIGTA. Spauskite bet kuri klavisa. ===
pause

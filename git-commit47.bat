@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

echo === 1. Salinamas stale git lock (jei yra) ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === 2. Stage'inami pakeitimai ===
git add src/components/admin/AdminCardsTable.tsx
git add src/app/admin/cards/page.tsx
git add src/app/admin/cards/actions.ts
git add scripts/import-demon-images.mjs
git add scripts/curse-cards.json
git add import-demon-images.bat
git add git-commit47.bat
git add -u

echo === 3. Commit ===
git commit -m "feat(admin): bulk edit/remove kortoms (checkbox zymejimas, bulk juosta: statusas/frakcija/tipas/retumas, bulk trynimas su patvirtinimu) + demonu kortu paveiksleliu importo skriptas"

echo === 4. Push ===
git push

echo.
echo === BAIGTA. Spauskite bet kuri klavisa. ===
pause

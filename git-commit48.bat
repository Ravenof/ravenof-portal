@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

echo === 1. Salinamas stale git lock (jei yra) ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === 2. Stage'inami pakeitimai ===
git add src/components/admin/CardForm.tsx
git add src/app/admin/cards/actions.ts
git add git-commit48.bat

echo === 3. Commit ===
git commit -m "fix(admin): leisti 0 aukso kaina Prakeiksmo kortoms - pridetas 0 variantas formoje, laukas nebeprivalomas curse tipui, serverio validacija priima 0 (=== null vietoj !falsy)"

echo === 4. Push ===
git push

echo.
echo === BAIGTA. Spauskite bet kuri klavisa. ===
pause

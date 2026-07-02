@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

echo === 1. Salinamas stale git lock (jei yra) ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === 2. Stage'inami pakeitimai ===
git add supabase/fix_user_collections_unique.sql
git add -u

echo === 3. Commit ===
git commit -m "fix(collection): OwnedToggle - getSession() vietoj getUser() (tylus null race), GameCard be preserve-3d (iOS hit-testing), translateZ izoliacija mygtukui; SQL fix user_collections unique constraint"

echo === 4. Push ===
git push

echo.
echo === BAIGTA. Spauskite bet kuri klavisa. ===
pause

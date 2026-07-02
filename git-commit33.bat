@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

echo === 1. Salinamas stale git lock (jei yra) ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === 2. Stage'inami pakeitimai ===
git add src/app/my-decks/loading.tsx
git add src/app/deck-builder/loading.tsx
git add src/app/leaderboards/loading.tsx
git add -u

echo === 3. Commit ===
git commit -m "perf: getCachedUser (1 auth uzklausa vietoj 2-3 per puslapi), middleware fast-path anonimams, getSession() kliente vietoj getUser(), cards/community-decks uzklausu lygiagretinimas, loading skeletonai my-decks/deck-builder/leaderboards"

echo === 4. Push ===
git push

echo.
echo === BAIGTA. Spauskite bet kuri klavisa. ===
pause

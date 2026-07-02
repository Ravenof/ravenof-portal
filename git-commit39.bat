@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

echo === 1. Salinamas stale git lock (jei yra) ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === 2. Stage'inami pakeitimai ===
git add src/components/decks
git add -u

echo === 3. Commit ===
git commit -m "feat(decks): kalades isbandymo rezimas - shuffle/draw/ranka/stalas su drag&drop, 3D apziura, garsai (draw, drop, shuffle), desktop fan + mobile pritaikymas; mygtukai my-decks ir community-decks"

echo === 4. Push ===
git push

echo.
echo === BAIGTA. Spauskite bet kuri klavisa. ===
pause

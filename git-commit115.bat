@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/deck-builder/SaveDeckButton.tsx
git commit -m "fix(deck-builder): kaladdes issaugojimas veikia net jei API schema cache nemato is_side_deck stulpelio - atsarginis ideejimas be stulpelio (kortos nedingsta, viesumo keitimas veikia)"
git push
git log -1 --oneline
) > commit115.log 2>&1

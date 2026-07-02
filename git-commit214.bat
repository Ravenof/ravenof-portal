@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/tutorial/engine.ts git-commit214.bat
git commit -m "feat(2v2): auros/global pasyvai per visus 4 seatus - 12 ciklu [you,ai]->allSeats(g), aura scope (friendly/enemy) ir triggerSide (own/enemy) komandiniai per sameTeam(); 1v1 identiska (sameTeam=seat lygybe), tsc svarus"
git push
) > commit214.log 2>&1

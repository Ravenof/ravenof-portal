@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/tutorial/engine.ts git-commit208.bat
git commit -m "refactor(2v2 stage1): variklio busena generalizuota i seat/komandos sluoksni ADITYVIAI - Side praplestas iki 4 seat (you/ai/ally/foe2), GameState +mode/teams/activeTeam/extraSeats (neprivalomi), P() skaito extraSeats, helperiai allSeats/teamOfSeat/friendlySeats/enemySeats. 1v1 elgsena NEPAKITUSI (nauji laukai undefined), tsc svarus"
git push
) > commit208.log 2>&1

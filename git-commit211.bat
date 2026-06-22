@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/tutorial/engine.ts git-commit211.bat
git commit -m "feat(2v2 stage4): createGame2v2 (4 seat you+ally vs ai+foe2, 2 komandos po bendra 60 HP) + komandos ejimai beginTeamTurn/endTeamTurn (visi komandos seatai gauna ejimo pradzia, globalTurn per komanda); beginTurn/endTurn perskaidyti i seatBeginTurn/seatEndTurn islaikant ta pacia 1v1 seka, tsc svarus"
git push
) > commit211.log 2>&1

@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/tutorial/TutorialGame.tsx src/components/digital/PvPLobby.tsx
git commit -m "feat(pvp): reconnect - aktyvi partija saugoma (localStorage), host atkuria busena; presence + 30s grace (varzovui atsijungus laukiama 30s, neprisijungus - pergale); lobby 'Grizti i zaidima' mygtukas"
git push
git log -1 --oneline
) > commit108.log 2>&1

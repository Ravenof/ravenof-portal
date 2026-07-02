@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
( git add src/components/tutorial/TutorialGame.tsx src/components/digital/PvPLobby.tsx & git commit -m "feat(pvp): PvP kovoje nerodomi tutorial pop-upai; header rodo varzovo varda+avatara (paspaudus - profilio popup su viesomis kaladmis ir nuoroda i profili); 60s ejimo laikmatis su auto end-turn" & git push ) > commit95.log 2>&1

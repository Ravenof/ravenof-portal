@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
( git add src/components/tutorial/TutorialGame.tsx src/components/digital/PvPLobby.tsx & git commit -m "feat(pvp): pasalinta 'Pilnas profilis' nuoroda (kad neisetum is zaidimo); PvP lobby - kaladziu pasirinkimas (dropdown is savo kaladziu) pries matchmaking" & git push ) > commit96.log 2>&1

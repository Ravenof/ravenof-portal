@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/lib/digital/native.ts src/app/digital/layout.tsx src/components/digital/DigitalPicker.tsx src/components/digital/DigitalPvE.tsx src/components/digital/DigitalPvP.tsx src/components/digital/PvPLobby.tsx src/components/digital/ranked/RankedClient.tsx src/lib/ranked/client.ts src/components/tutorial/PracticeButton.tsx src/components/tutorial/TutorialGame.tsx src/components/social/FriendsClient.tsx git-commit245.bat
git commit -m "feat(digital): fullscreen + custom pickers + draggable chat. (1) Immersive: StatusBar.hide per Capacitor (setNativeImmersive) - app be virsutines juostos. (2) DigitalPicker bottom-sheet (portalas, frakcijos ikona+pavadinimas) vietoj native <select> - PvE/PvP/Ranked/PvPLobby/Practice. (3) Practice popup perdarytas i rounded glass. (4) Draugu chat (FriendsClient) per portala - telpa, nelenda po nav, input matomas. (5) Kovos chat - Messenger stiliaus tampomas burbulas (drag bet kur, unread badge+preview, bakstelk atidaryk)."
git push
) > commit245.log 2>&1

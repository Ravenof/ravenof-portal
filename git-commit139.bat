@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/digital/DigitalHub.tsx src/components/digital/DigitalPvE.tsx src/components/digital/DigitalPvP.tsx src/app/digital/pve/page.tsx src/app/digital/pvp/page.tsx src/components/deck-builder/SaveDeckButton.tsx src/app/deck-builder/DeckBuilderClient.tsx
git commit -m "feat(digital): FAZE 4 - PvE (/digital/pve) ir PvP (/digital/pvp) puslapiai main-menu stiliumi (raizyti + liepsnos), meniu plyteles veda i juos; supaprastintas hub (be deck selektoriaus/modalu); deck builder issaugojus lieka digital aplinkoje (redirectTo); stiliaus vientisumas"
git push
git log -1 --oneline
) > commit139.log 2>&1

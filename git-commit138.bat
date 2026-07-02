@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/app/digital/deck/page.tsx src/app/digital/layout.tsx src/app/deck-builder/DeckBuilderClient.tsx
git commit -m "feat(digital): FAZE 3 - deck builder Digital aplinkoje (/digital/deck), naudoja ta pati DeckBuilderClient su embedded (skaidrus fonas - matosi liepsnos), digital nav Kalades -> /digital/deck"
git push
git log -1 --oneline
) > commit138.log 2>&1

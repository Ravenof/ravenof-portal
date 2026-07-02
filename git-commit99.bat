@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/lib/tutorial/engine.ts src/components/tutorial/TutorialGame.tsx
git commit -m "feat(game): Batch 3 - cempionu 3 faziu evoliucija: tribute 1 is lauko ARBA 2 is rankos, fazes swap zemyn (3->2/1, 2->1) is kaladdes, faziu salygos + pakopiniai skills (UI: tribute rinkimas, swap pop-up)"
git push
git log -1 --oneline
) > commit99.log 2>&1

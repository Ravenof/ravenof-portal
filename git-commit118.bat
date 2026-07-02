@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/tutorial/TutorialGame.tsx
git commit -m "fix(pvp): abu zaidejai zaide su host kalade - svecias dabar atsiuncia savo kalade host'ui per realtime (broadcast 'deck'/'reqdeck'), todel host nebereikia skaityti privacios svecio kalades is DB (RLS). Host laukia svecio kaladzes (nebenukrenta i savo kalade), su 8s saugikliu"
git push
git log -1 --oneline
) > commit118.log 2>&1

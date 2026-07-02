@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/tutorial/TutorialGame.tsx
git commit -m "feat(game): kortose nebededam papildomo teksto/stats (matosi ant pacios kortos art) - readable rodo tik paveiksla; pradejus zaidima - fullscreen + screen wake lock (kiek narsykle leidzia)"
git push
git log -1 --oneline
) > commit105.log 2>&1

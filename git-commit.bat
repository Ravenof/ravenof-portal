@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
git add -A
git status
git commit -m "feat: LorePanel fix, factions pages, announcements system (#186, #187, #188)"
git push origin main
echo.
echo DONE
pause

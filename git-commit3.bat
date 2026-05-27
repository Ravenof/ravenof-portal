@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
if exist ".git\index.lock" del /f ".git\index.lock"
git add -A
git status
git commit -m "feat: card pack opening system — DB, animated UI, admin CRUD (#189)"
git push origin main
echo.
echo DONE
pause

@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
if exist ".git\index.lock" del /f ".git\index.lock"
git add -A
git commit -m "feat: admin pack card pool — visual card picker with search/filter/checkbox"
git push origin main
echo.
echo DONE
pause

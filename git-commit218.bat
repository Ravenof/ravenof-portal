@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/digital/DigitalHub.tsx git-commit218.bat
git commit -m "chore(2v2): isimti CO-OP 2v2 ir PVP 2v2 plyteles is hub navigacijos (nedarom 2v2). 2v2 kodas lieka repo bet nepasiekiamas is nav"
git push
) > commit218.log 2>&1

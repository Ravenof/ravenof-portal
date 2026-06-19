@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/ArenaBackground.tsx git-commit166.bat
git commit -m "fix(arena): arena fonas uzdenge UI - pakeista zIndex 0 -> -1, kad liktu uz turinio (virs root fono, bet po kortom/juostom); grazinta pointerEvents none"
git push
) > commit166.log 2>&1

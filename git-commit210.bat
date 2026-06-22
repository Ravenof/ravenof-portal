@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/targetResolver.ts git-commit210.bat
git commit -m "refactor(2v2 stage3): efektu taikymas komandinis - resolveTargets iteruoja friendly/enemy seat sarasus (savi=visa komanda abu komandieciai, priesas=abu priesu seat), P skaito extraSeats; 1v1 (vienas seat komandoje) identiskas. Testai 12/12: friendly efektai veikia ir ally creatures"
git push
) > commit210.log 2>&1

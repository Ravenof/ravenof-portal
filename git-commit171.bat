@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/SummonBurst.tsx git-commit171.bat
git commit -m "perf(fx): mobile LOW rezimas summon efektams - telefonuose dpr=1, ~50%% maziau particle/body, shadowBlur isjungtas (didziausias perf laimejimas); desktop pilna kokybe nepakeista"
git push
) > commit171.log 2>&1

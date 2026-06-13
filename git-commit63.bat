@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/TutorialGame.tsx src/lib/tutorial/engine.ts git-commit63.bat
git commit -m "feat(game): kapinynu perziura (hover PC / palaikius pirsta mobile - abi puses, kortos apziurai); sunaikinimo skrydzio animacija is lauko i kapinyna; traukimo animacija is kalades puses; auksas kaip moneta"
git push
) > commit63.log 2>&1

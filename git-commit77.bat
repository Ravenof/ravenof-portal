@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/tutorial/engine.ts src/lib/game/effectEngine.ts src/lib/game/types.ts git-commit77.bat
git commit -m "feat(gameplay): efektai selfToEnemyHand / selfToOwnHand - Paskutinio noro metu korta keliauja i prieso/savo ranka vietoj kapinyno (killUnit reroute)"
git push
) > commit77.log 2>&1

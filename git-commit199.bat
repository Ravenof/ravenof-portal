@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/types.ts src/lib/game/effectEngine.ts src/components/admin/GameplayConfigEditor.tsx git-commit199.bat
git commit -m "feat(effects): naujas efektas drawUntilHand - traukti kol rankoje bus X kortu (burtams ir kuriniams); no-target/no-select; reiksmes etikete Rankoje kortu (X)"
git push
) > commit199.log 2>&1

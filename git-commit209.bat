@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/tutorial/engine.ts git-commit209.bat
git commit -m "refactor(2v2 stage2): zala/gydymas/checkWin per komandos bendra HP kai mode=2v2 (applyPlayerDamage/applyPlayerHeal/winnerTeam); 1v1 helperiai krenta i ta pacia sena logika - elgsena identiska, tsc svarus"
git push
) > commit209.log 2>&1

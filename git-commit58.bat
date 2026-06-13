@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/types.ts src/lib/game/targetResolver.ts src/lib/game/effectEngine.ts src/lib/tutorial/engine.ts src/components/admin/GameplayConfigEditor.tsx git-commit58.bat
git commit -m "feat(gameplay): Phase C+D - zonu operacijos (summon su kainos/potipio filtru ir count, mill, returnGraveyardToDeck) + selfUnit taikinys; globalus ivykiu pasyvai onAnyDeath/onAnyAttack (skenuoja kovos lauka, re-entrancy apsauga)"
git push
) > commit58.log 2>&1

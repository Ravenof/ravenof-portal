@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/lib/game/types.ts src/lib/tutorial/engine.ts src/components/admin/GameplayConfigEditor.tsx git-commit232.bat
git commit -m "feat(engine): ninja efektai - papildomos atakos per ejima (base/ifEnemyTaunt/perEnemyTaunt dinamine/ifNoEnemyCreatures), ignoreTaunt (pulti tiesiogiai), sinergija (kai sis+partneris pagal varda/frakcija abu lauke -> buff ATK/HP/raktazodziai). Admin editorius + zero regresiju (sim 26/3)"
git push
) > commit232.log 2>&1

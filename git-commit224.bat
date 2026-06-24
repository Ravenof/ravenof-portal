@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/lib/game/types.ts src/lib/tutorial/engine.ts src/lib/game/effectEngine.ts src/components/admin/GameplayConfigEditor.tsx git-commit224.bat
git commit -m "feat(engine): 6 nauju kortu efektu galimybiu - laikinas buff (endOfTurn/untilNextTurn), prikelti butent sunaikinta taikini (reviveDestroyedTarget), summon pop-up su restrict/visi tinkami (summonChoose), card draw twist (is kapinyno/tik tipas/traukti N pasilikti K), grant raktazodi iskviestam padarui (targetSummoned). Admin editorius + zero regresiju (sim 26/3 kaip HEAD)"
git push
) > commit224.log 2>&1

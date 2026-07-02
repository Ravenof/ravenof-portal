@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/lib/game/types.ts src/lib/game/targetResolver.ts src/lib/game/effectEngine.ts src/components/tutorial/TutorialGame.tsx src/components/admin/GameplayConfigEditor.tsx
git commit -m "feat(game): burtai/efektai gali taikytis i kelis taikiniu TIPUS (varnelemis) - padaras+zaidejas+artefaktas+cempionas union; zaidejas renkasi is visu pazymetu (engine+UI+admin)"
git push
git log -1 --oneline
) > commit107.log 2>&1

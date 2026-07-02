@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/lib/game/types.ts src/lib/tutorial/engine.ts src/lib/game/effectEngine.ts src/lib/game/triggerSystem.ts src/components/tutorial/TutorialGame.tsx src/components/admin/GameplayConfigEditor.tsx
git commit -m "feat(game): Batch 2 - rankinis keliu taikiniu parinkimas (1/N), follow-up sameTarget + onlyIfTargetDied (Kamuolinis zaibas), pasirink 1 is keliu efektu pop-up, kovos suksnis tik suzaidus ta korta, Alchemiku fortas (burta -> kalade), Milva tutor pagal burto tipa"
git push
git log -1 --oneline
) > commit98.log 2>&1

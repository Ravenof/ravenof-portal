@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/lib/game/types.ts src/lib/tutorial/engine.ts src/lib/game/effectEngine.ts src/components/tutorial/TutorialGame.tsx src/components/admin/GameplayConfigEditor.tsx
git commit -m "feat(game): prakeiksmu pasirinkimo savininkas (chooseBy: caster/opponent) - chooseEffect pop-up gali rinktis auka (pvz. prakeiksmas: auka renkasi parodyt ranka ARBA patirt po 1 dmg uz korta). UI pop-up rodomas tam kas renkasi (chooser); PvP swapPerspective atnaujintas"
git push
git log -1 --oneline
) > commit122.log 2>&1

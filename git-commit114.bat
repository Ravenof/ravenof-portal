@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/lib/game/types.ts src/lib/game/effectEngine.ts src/lib/game/targetResolver.ts src/lib/tutorial/engine.ts src/components/admin/GameplayConfigEditor.tsx
git commit -m "feat(game): castSpell taikinys - reakcija (onAnyCast) gali nutildyti/atsaukti dabar zaidziama burta; useAttackTarget - onAttack/onAttacked efektas taikomas i kovos taikini (pvz. padaras puola padara ir ji apsvaigina ta pati)"
git push
git log -1 --oneline
) > commit114.log 2>&1

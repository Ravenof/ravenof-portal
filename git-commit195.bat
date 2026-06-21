@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/types.ts src/lib/tutorial/engine.ts src/lib/game/effectEngine.ts src/components/admin/GameplayConfigEditor.tsx git-commit195.bat
git commit -m "feat(effects): nauji reakciju blokai - overflowToPlayer (pertekline zala virs taikinio HP pereina jo zaidejui) + reflectToAttacker efektas (onAttacked: sunaikina puolanti padara ir atspindi jo ATK i puolejo zaideja); engine dealToUnit overflow param + gameApi.effectiveAtk; redaktoriuje checkbox + auto useAttackTarget + hint"
git push
) > commit195.log 2>&1

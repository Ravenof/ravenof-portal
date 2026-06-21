@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/tutorial/engine.ts src/components/tutorial/TutorialGame.tsx git-commit197.bat
git commit -m "feat(ui): burtu kortose rankoje zymejimai - pigesne kaina zalia (su svytejimu) per effectiveCost, ir +X zalos oranzinis zenklas kai aktyvi burtu zalos aura (auraSpellDamageBonus); MiniCard costNow+dmgBonus props"
git push
) > commit197.log 2>&1

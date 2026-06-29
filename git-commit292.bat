@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/lib/game/types.ts src/lib/tutorial/engine.ts src/components/admin/GameplayConfigEditor.tsx git-commit292.bat
git commit -m "feat(aura): antra ataka sunaikinus padara (5/11). Naujas passiveAura.auraSecondAttack + auraSecondAttackCond (any/taunt/shield). Engine: attack() po sunaikinimo, jei puolantysis gyvas ir veikiamas tokios auros (su salyga - sunaikintas padaras turejo Pasisaipyma ar Magiska skyda, ar bet kuris), grazinam atakos teise (attacksUsed-1, attacksThisTurn-1) -> gali pulti dar karta. Sau: auraIncludesSelf. Admin: aura sekcijoje checkbox + salygos select. tsc svarus."
git push
) > commit292.log 2>&1

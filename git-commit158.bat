@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/types.ts src/components/tutorial/SummonBurst.tsx src/components/tutorial/BattleEffectOverlay.tsx src/components/tutorial/TutorialGame.tsx git-commit158.bat
git commit -m "feat(fx): summon efektu remake - 22 dark-fantasy variantai (vietoj 8), ORIGIN-BASED (plinta nuo iskviestos kortos i aplinka, ne full-screen). Naujas SummonBurst canvas variklis (centrinis glow + sklindantys ziedai + teminiai particle + glifai kaukole/pentagrama/runa/akis/kryzius + formos plysiai/sesielu tendriliai/sviesos stulpas); BattleEffectOverlay atjungtas; screen shake per fxRef"
git push
) > commit158.log 2>&1

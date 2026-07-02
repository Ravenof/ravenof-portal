@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/types.ts src/components/tutorial/BattleEffectOverlay.tsx src/components/tutorial/TutorialGame.tsx src/components/admin/GameplayConfigEditor.tsx git-commit150.bat
git commit -m "feat(fx): pilno lauko summon efektai (8: uztemimas, nekrotinis dumas, nuzaibavimas, mass freeze, ugnis, sprogimas, nuodu debesis, zemes drebejimas su screen shake) - parenkami kortos mapinime (gameplay.summonEffect), CSS/SVG art iki 5s, BattleEffectOverlay"
git push
) > commit150.log 2>&1

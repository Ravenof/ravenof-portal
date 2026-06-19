@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/BattleEffectOverlay.tsx src/lib/game/types.ts git-commit152.bat
git commit -m "feat(fx): nuzaibavimas = sakotas elektros tinklas (proceduriniai branching bolt'ai canvas, persigeneruoja kas blyksni); uztemimas -> piktoji tamsa (uzspaudzia is krastu, purpurinis evil glow, shadow daleles), be eclipse disko"
git push
) > commit152.log 2>&1

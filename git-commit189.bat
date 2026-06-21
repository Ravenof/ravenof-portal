@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/types.ts src/lib/game/effectEngine.ts src/components/admin/GameplayConfigEditor.tsx git-commit189.bat
git commit -m "feat(admin/effects): aiskus pazymetu tipu rezimas - ARBA (zaidejas renkasi 1 is pazymetu, default) vs VISIEMS pazymetiems (AoE), applyToAllTypes veliava; engine aoe=hasTypes?applyToAllTypes:isMultiTarget; mappingNeedsSelection nereikalauja pasirinkimo AoE rezime. Mygtukai pagrindiniam efektui ir + Tada padaryk dar grandineje"
git push
) > commit189.log 2>&1

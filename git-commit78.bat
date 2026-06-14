@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/tutorial/engine.ts src/lib/game/effectEngine.ts src/lib/game/types.ts src/components/admin/GameplayConfigEditor.tsx git-commit78.bat
git commit -m "feat(gameplay): summonAdvanced efektas - iskviecia padara is pasirinktu zonu (ranka/kalade/kapinynas, gali visi 3), su kainos diapazonu (min/max), potipiu, kiekiu; laikas valdomas trigeriu (onSummon=1x, onTurnStart=kas ejima, ar bet koks)"
git push
) > commit78.log 2>&1

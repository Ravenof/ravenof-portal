@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/lib/game/types.ts
git add src/lib/game/effectEngine.ts
git add src/lib/game/effectAnimations.ts
git add src/components/admin/GameplayConfigEditor.tsx
git add src/lib/version.ts
git add git-commit457.bat
git commit -m "feat(effects): CLEANSE - vienkartinis busenu nuemimas (pvz. kibiras vandens nuima Deganti). Naujas EffectType cleanse (grupe Statusai) + mapping laukas cleanseStatuses[] (frozen/burning/poisoned/stunned/silenced/blessed; TUSCIA = visos NEIGIAMOS). effectEngine case cleanse: nuo taikiniu istrina pasirinktas busenas su logu kurios nuimtos (arba pranesa kad neturi); veikia per esama target sistema (pasirink taikini/visi/pan.). ADMIN mapping editor: cleanse pasirinkus rodomas 6 busenu checkbox blokas su hint (nieko nepazymejus - visos neigiamos; blessed tik dispel atvejui). FX: cleanse -> healStream animacija + heal garsas. APP_VERSION=457. tsc svarus." > commit457.log 2>&1
git push >> commit457.log 2>&1
type commit457.log
echo ============= BAIGTA (cleanse efektas, v457). =============
pause

@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/lib/game/types.ts
git add src/lib/tutorial/engine.ts
git add src/components/admin/GameplayConfigEditor.tsx
git add src/lib/version.ts
git add git-commit458.bat
git commit -m "feat(effects): imuniteto aura gauna busenu pasirinkima (kaip cleanse). PassiveAura += auraStatusImmunityStatuses[] (frozen/burning/poisoned/stunned/silenced; TUSCIA = visos neigiamos). Engine: BoardUnit.auraStatusImmune boolean -> TutStatus[] (union is visu auros saltiniu - keli saltiniai sudeda savo sarasus), applyStatus guard tikrina includes(st). ADMIN: pazymejus Imuniteta busenoms atsiskleidzia 5 neigiamu busenu checkbox blokas su hint. APP_VERSION=458. tsc svarus." > commit458.log 2>&1
git push >> commit458.log 2>&1
type commit458.log
echo ============= BAIGTA (imuniteto auros selection, v458). =============
pause

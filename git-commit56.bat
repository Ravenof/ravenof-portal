@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/types.ts src/lib/game/targetResolver.ts src/lib/game/effectEngine.ts src/components/admin/GameplayConfigEditor.tsx git-commit56.bat
git commit -m "feat(gameplay): generiniai efektu primityvai - salygos (metrika op value, fallback poroms), dinamines reiksmes (base + perEach * metrika), taikiniu selektoriai (max/min HP/ATT/cost, tik suzeisti); engine + admin UI"
git push
) > commit56.log 2>&1

@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/tutorial/engine.ts src/lib/game/effectEngine.ts src/lib/game/types.ts src/components/admin/GameplayConfigEditor.tsx git-commit85.bat
git commit -m "feat(summon): summonNames whitelist - apriboti iskvietima iki konkreciu kortu (1 ar kelios pagal varda); veikia su zonu kombinacija ir su zaidejo pasirinkimu (renkasi is riboto saraso)"
git push
) > commit85.log 2>&1

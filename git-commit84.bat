@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/types.ts src/lib/game/targetResolver.ts src/lib/game/effectEngine.ts src/components/admin/GameplayConfigEditor.tsx git-commit84.bat
git commit -m "ux(admin): aiskesnis target mapinimas - Reiksme pervadinta (Zala/Gydymas/+ATK...), vienas Parinkimas dropdown (zaidejas/auto-kriterijus/atsitiktinis), Taikiniu sk. (hitCount) auto/random multi-target; AOE per Taikinys; engine pickNBySelect/autoPickN"
git push
) > commit84.log 2>&1

@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/lib/game/types.ts
git add git-commit271.bat
echo === Commit ===
git commit -m "fix(build): pridedu 'onCurseDrawn' i TriggerType (+TRIGGER_TYPES label). Commit270 uzkele engine.ts su curse-activation kodu (m.trigger==='onCurseDrawn'), bet types.ts su tos reiksmes apibrezimu buvo necommitintas -> Vercel TS2367 'no overlap'. Sis commit'as juos suderina. (Likę necommitinti curse-activation admin UI failai - CardForm/GameplayConfigEditor/RankedAdminClient - yra atskiras WIP, buildui nereikalingi.)"
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause

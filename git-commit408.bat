@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/lib/digital/native.ts
git add git-commit408.bat
echo === Commit ===
git commit -m "fix(orientation): native lock/unlock = no-op (AndroidManifest sensorLandscape valdo). Priezastis kodel nesilockino: plugin unlockOrientation() (layout/combat unmount'e) resetindavo i UNSPECIFIED ir override'indavo manifesta -> leisdavo portrait. Dabar native niekada neliecia orientacijos, manifest laiko landscape. Web fallback nekeistas. Veikia be APK rebuild (JS is Vercel). tsc svarus." > commit408.log 2>&1
echo === Push ===
git push >> commit408.log 2>&1
type commit408.log
echo.
echo ============= BAIGTA. =============

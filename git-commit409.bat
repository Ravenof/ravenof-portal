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
git add git-commit409.bat
echo === Commit ===
git commit -m "fix(orientation): native = AKTYVUS plugin lock landscape + niekada neatrakinam. commit408 per daug - padariau ir lock no-op, tad niekas aktyviai neuzrakino (manifest vienas neuzteko). Dabar lockLandscape (app shell mount + combat) aktyviai kviecia ScreenOrientation.lock landscape (patikrinta - veikia), unlockOrientation native = no-op, tad landscape laikosi per visa app. Veikia be APK rebuild (plugin jau APK, JS is Vercel). tsc svarus." > commit409.log 2>&1
echo === Push ===
git push >> commit409.log 2>&1
type commit409.log
echo.
echo ============= BAIGTA. =============

@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add android/app/src/main/AndroidManifest.xml
git add src/app/digital/layout.tsx
git add src/components/digital/DigitalHub.tsx
git add git-commit407.bat
echo === Commit ===
git commit -m "fix(menu): Home overlap + auto-landscape. (1) AndroidManifest MainActivity screenOrientation=sensorLandscape -> APK visada landscape is karto (reikia APK rebuild). (2) 'Pasuk telefona' overlay tik web'e (!isNativeApp) - native nerodo. (3) Home overlap fix: vietoj calc(100dvh) (webview'e nepatikimas -> flex children persidengdavo) natural document flow (min-h-full), grid auto-height, quests scroll maxHeight 30vh, hero apribotas maxWidth 520+overflow-hidden. tsc svarus." > commit407.log 2>&1
echo === Push ===
git push >> commit407.log 2>&1
type commit407.log
echo.
echo ============= BAIGTA. =============

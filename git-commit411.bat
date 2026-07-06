@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/lib/digital/native.ts
git add src/app/digital/layout.tsx
git add git-commit411.bat
git commit -m "fix(orientation): native lock = tik AndroidManifest (screenOrientation=landscape). JS nebeliecia plugin'o native'e (remote-URL shell'e bridge nepasiekia -> lock/unlock nieko nedaro arba override'ina manifesta). Web fallback lieka. Reikia SVARAUS APK rebuild kad manifest landscape isigaliotu." > commit411.log 2>&1
git push >> commit411.log 2>&1
type commit411.log
echo ============= BAIGTA (JS). =============

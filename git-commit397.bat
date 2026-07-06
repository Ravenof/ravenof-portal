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
git add src/components/tutorial/TutorialGame.tsx
git add src/components/tutorial/BattleLayout.tsx
git add CAPACITOR-ANDROID.md
git add git-commit397.bat
echo === Commit ===
git commit -m "feat(combat F7): mobile landscape orientation lock. native.ts: lockLandscape/unlockOrientation/isPortraitNow (web-safe per window.Capacitor.Plugins.ScreenOrientation guard'ai; web fallback = Screen Orientation API). TutorialGame: H kovoj (useHLayout+isTouch) uzrakina landscape iejant/nuima iseinant, portrait -> 'Pasuk telefona' overlay (rvnRotateHint). BattleLayout: safe-area insets (max(pad, env(safe-area-inset-*)) - notch kaireje landscape). APK: reikia npm i @capacitor/screen-orientation + npx cap sync (doc CAPACITOR-ANDROID.md); package.json nekeistas kad neluztu install. tsc svarus." > commit397.log 2>&1
echo === Push ===
git push >> commit397.log 2>&1
type commit397.log
echo.
echo ============= BAIGTA (F7). =============

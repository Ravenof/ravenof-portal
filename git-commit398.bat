@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/components/tutorial/TutorialGame.tsx
git add git-commit398.bat
echo === Commit ===
git commit -m "feat(combat): horizontal (landscape) layout tampa DEFAULT. useHLayout dabar true visur; ?layout=v grazina sena vertikalu/desktop layout'a (rollback, seni blokai dar NETRINTI). APK (remote-URL shell) rodys H be rebuild - tik deploy; native combat auto-lock landscape (screen-orientation plugin jau synced). tsc svarus." > commit398.log 2>&1
echo === Push ===
git push >> commit398.log 2>&1
type commit398.log
echo.
echo ============= BAIGTA (H default). =============

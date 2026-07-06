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
git add git-commit405.bat
echo === Commit ===
git commit -m "fix(combat H): 2-as bakst ant issiskleidusios rankos = tik sutraukia (nebezaidzia kortos). Zaidimas TIK tempiant korta auksTyn (drag&drop). tsc svarus." > commit405.log 2>&1
echo === Push ===
git push >> commit405.log 2>&1
type commit405.log
echo.
echo ============= BAIGTA. =============

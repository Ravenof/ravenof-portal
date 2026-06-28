@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/components/tutorial2/TutorialOverlay.tsx
git add src/components/tutorial2/TutorialDirector.tsx
git add git-commit274.bat
echo === Commit ===
git commit -m "fix(tutorial): dialogo burbulas/objektyvas/reward nesimato - portal stacking bug. TutorialGame lenta renderinama per createPortal i document.body (z-120), o overlay buvo normaliame puslapio medyje -> ikalintas zemesnio stacking-context, todel po lenta (nepaisant z-200). Gate veike (toast 'Pirma perskaityk paaiskinima' + blokavo end turn), bet burbulas nesimate. Fix: TutorialOverlay ir RewardScreen dabar irgi renderinami per createPortal(document.body) su z 350/360 -> virs lentos. Dabar dialogai matosi, 'Toliau' veikia, eiga atsirakina."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause

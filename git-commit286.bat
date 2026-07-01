@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/components/digital/DigitalHub.tsx
git add git-commit286.bat
echo === Commit ===
git commit -m "feat(retention): naujoko 'Pradek cia' nudge. Jei zaidejas dar neturi ne vienos starter kalades (newPlayer), meniu virsuje rodomas ryskus kvietimas -> Mokymai (nemokama kalade). Turintiems kalade nesirodo. Pirmas naujoko-kilpos zingsnis."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause

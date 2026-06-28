@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/components/digital/DigitalHub.tsx
git add git-commit266.bat
echo === Commit ===
git commit -m "chore(campaign): paslepti kampanija is pagrindinio meniu (atideta). Pasalinti abu DigitalHub iejimai (aktyvus 'Kampanija' tile + 'NETRUKUS' placeholder) + nebenaudojami MapIcon/Lock importai. Route /digital/campaign lieka, bet be nuorodu. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause

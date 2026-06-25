@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/digital/DigitalCollection.tsx git-commit251.bat
git commit -m "fix(digital): Kolekcijoje 'Atplesti pakus' atidaro paku atplesima (PackOpen + chooser), o ne parduotuve. Phase 1 metu nepernesta pack-open logika; dabar veikia: vienas pakas - iskart, keli - pasirinkimas; po atplesimo atnaujina kolekcija + balansa."
git push
) > commit251.log 2>&1

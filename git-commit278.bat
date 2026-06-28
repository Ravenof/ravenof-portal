@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add public/digital/ui
git add src/components/digital/ui/HubKit.tsx
git add src/components/digital/DigitalHub.tsx
git add git-commit278.bat
echo === Commit ===
git commit -m "feat(ui): meniu identiskas reference - reward banner + sezono kelias + mokymai is realiu assetu, Kampanija pasalinta. Iskirpti papildomi assets: banner-claim (su slotais x250/x1 + Atsiimti), prog-season (Sezono kelias: emblema+pakopa+progress+slotai x500/x10+arrow), prog-tutorial (Mokymai: emblema+progress+slot), avatar-default (raven). DigitalHub: reward banner = banner-claim assetas (dim+Atsiimta kai paimta), Sezono kelias/Mokymai = realios kortos (buvo CSS), Kampanija visiskai pasalinta. ProfileChip default avatar = raven paveiksliukas. Viskas dabar pagal reference."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause

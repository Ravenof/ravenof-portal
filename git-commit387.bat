@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/app/digital/layout.tsx
git add src/components/digital/ui/HubKit.tsx
git add public/digital/icons/fi-pve.png
git add public/digital/icons/fi-pvp.png
git add public/digital/icons/fi-ranked.png
git add git-commit387.bat
echo === Commit ===
git commit -m "fix(icons): bottom nav + combat modes matomumas. nav-* buvo permatomi bet per tamsus -> CSS recolor filtras (sviesi/auksine silueta). fi-modes turejo BALTA fona -> baltas paverstas permatomu (PIL) + svelnus brightness. Nav-more fallback lieka. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. =============
pause

@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/app/digital/layout.tsx
git add src/components/digital/DigitalHub.tsx
git add public/digital/icons/README.md
git add git-commit384.bat
echo === Commit ===
git commit -m "redesign(main menu): 3 valiutos i header (be logo, Sidabras/Rubinai/Esencija - pasalintas silver dublikatas). Vietoj valiutu juostos - 3 segmentai vienoj eilej (Uzduotys/Sezonas/Dovanos). Kitas veiksmas + Zaisti lieka. Pasalinti quick actions grid (yra bottom nav) + StatCards + standalone login mygtukas. RvnIcon slot'ai: cur-silver/rubies/essence, seg-quests/season/login. icons/README.md atnaujintas (visi slot'ai + dydziai). tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. =============
pause

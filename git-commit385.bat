@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam ikonas (naujas + pakeistas + istrintas) ===
git add -A public/digital/icons
echo === Pridedam kodo failus (jei dar ne) ===
git add src/app/digital/layout.tsx src/components/digital/DigitalHub.tsx
git add git-commit385.bat
echo === Commit ===
git commit -m "assets(icons): main menu ikonos (cur-silver/rubies/essence, seg-quests/season/login, pack, fi-modes, nav-*); pataisytas cur-silver.png.png -> cur-silver.png"
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause

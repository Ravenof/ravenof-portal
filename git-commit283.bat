@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/components/digital/ui/RvnIcon.tsx
git add src/components/digital/ui/HubKit.tsx
git add src/components/digital/DigitalHub.tsx
git add src/app/digital/layout.tsx
git add public/digital/icons/README.md
git add git-commit283.bat
echo === Commit ===
git commit -m "feat(ui): drop-in ikonu sistema. RvnIcon komponentas bando /public/digital/icons/<name>.png; jei nera - fallback i imontuota (lucide/emoji) ikona, tad ikonas galima deti palaipsniui be kodo. Prijungta: modes (mode-pve/ranked/free), quick (qa-decks/collection/quests/shop), stat emblemos (emblem-season/tutorial), flame, avatar, bell, settings, bottom nav (nav-home/collection/decks/shop/more). README.md su tiksliais pavadinimais/dydziais/formatu. ICON_EXT vienas perjungiklis PNG/SVG/WEBP. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause

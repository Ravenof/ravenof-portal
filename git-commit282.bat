@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/components/digital/ui/HubKit.tsx
git add src/components/digital/DigitalHub.tsx
git add src/app/digital/layout.tsx
git add git-commit282.bat
echo === Commit ===
git commit -m "feat(ui): meniu perdarytas i GRYNA premium CSS (be raster assetu) + gyvi duomenys. HubKit: rvn-panel (gilus violetinis+auksinis remas, inset highlight, glow), rvn-gold-btn (tikras game gold mygtukas su inset/shadow/glow). RewardBanner(flame+chips+gyva serija), PlayHeroCard(radial bordo/gold fonas + CTA virs 3 rezimu eiles), ModeSelector(3 stulpeliai, selected glow), QuickActionCard(ikona+badge), StatCard(Sezono kelias/Mokymai su gyvu progresu). Header CSS logo + lucide nav (aktyvus auksinis glow). Gyvi: serija/sezonas/mokymai/uzduotys/header level-xp-auksas-paketai-unread. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause

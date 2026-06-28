@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add public/digital/ui2
git add src/components/digital/ui/HubKit.tsx
git add src/components/digital/DigitalHub.tsx
git add src/app/digital/layout.tsx
git add git-commit280.bat
echo === Commit ===
git commit -m "feat(ui): meniu perdarytas su SVARIAIS pateiktais assetais (ravenof_main_menu_cropped_assets) + gyvi duomenys. Nauji public/digital/ui2: logo, raven avatar, hero bg, heading/subtitle, CTA, 6 mode tiles, 4 quick-action korteles, crest/cap emblemos, flame, reward chips, 5 bottom-nav ikonos. HubKit: PlayHeroCard naudoja heading+subtitle+CTA images; ModeSelector mode images; RewardBanner flame+chip images+gyva serija; StatCard crest/cap emblema+gyvas progresas. DigitalHub: Sezono kelias (crest, gyva pakopa/progresas, chips), Mokymai (cap, gyva claimed/8). Layout: logo + bottom nav ikonu paveiksliukai (aktyvus auksinis glow). Gyvi: serija, sezonas, mokymai, header level/xp/auksas/paketai/unread. Hero/modes/quick = baked (statiski labeliai). tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause

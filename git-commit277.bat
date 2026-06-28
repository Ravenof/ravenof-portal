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
git add src/app/digital/layout.tsx
git add git-commit277.bat
echo === Commit ===
git commit -m "feat(ui): naudoti REALIUS UI assets pagrindiniame meniu (ne generic CSS). Is ikeltu UI elements lapu iskirpti ir optimizuoti (webp) 13 assetu i public/digital/ui: hero arena fonas, RAVENOF logo, auksinis 'Pradeti kova' CTA, 6 mode tiles (default+selected pve/ranked/free), 4 quick-action korteles (Kalades/Kolekcija/Uzduotys/Parduotuve). HubKit: PlayHeroCard = cinematic arena bg + heading + CTA assetas; ModeSelector = realios mode tiles su selected glow swap; QuickActionCard = realios korteles. Layout header = logo paveiksliukas. Premium dark-fantasy vaizdas vietoj plokscio CSS."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause

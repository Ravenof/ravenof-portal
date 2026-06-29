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
git add git-commit284.bat
echo === Commit ===
git commit -m "feat(ui): naudoti pilnus permatomus komponentu remus (be bg). Iskirpti svarus pilni kadrai i ui2: 4 quick-action korteles (card-decks/collection/quests/shop + -hi highlight), hero arena bg, heading/subtitle/CTA, 6 mode tiles (default/active). HubKit: QuickActionCard = pilnas paveikslas su highlight on press; ModeSelector = mode tiles images (3 stulpeliai, selected glow); PlayHeroCard = arena bg + heading/subtitle/CTA images. Komponentai permatomi -> gulasi ant tamsaus app fono. Banner/Sezono/Mokymai lieka CSS gyvi; nav/header drop-in ikonos. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause

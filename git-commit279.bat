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
git add git-commit279.bat
echo === Commit ===
git commit -m "feat(ui): meniu rodo GYVUS zaidejo duomenis. Reward banner / Sezono kelias / Mokymai perdaryti i CSS su realiomis iskirptomis emblemomis (flame, emb-season) + gyvas tekstas/progresas: serija (loginCheckin streak), Sezono pakopa+progresas (getSeasonPass tiers vs xp), Mokymai claimed/8 starter kalades (getStarterDecks). Header jau gyvas (vardas/level/XP/auksas/paketai/unread). Hero/modes/quick-action lieka baked assets (statiski labeliai). StatCard + RewardChip komponentai. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause

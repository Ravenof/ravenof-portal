@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/components/digital/ui/HubKit.tsx
git add git-commit281.bat
echo === Commit ===
git commit -m "fix(ui): hero CTA nebesislepia po rezimais. ModeSelector vertikaliai sukrauti tiles -> 3 stulpeliu eile (kaip reference). PlayHeroCard pakeistas i flex-col su gap (heading -> CTA -> rezimai), CTA maxWidth+centruotas. CTA dabar aiskiai virs 3 rezimu eiles, be persidengimo."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause

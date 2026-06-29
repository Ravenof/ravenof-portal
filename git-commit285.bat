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
git add git-commit285.bat
echo === Commit ===
git commit -m "fix(ui): meniu poliravimas. (1) Assetai apkarpyti iki turinio + suvienodinta drobe -> quick korteles vienodo dydzio ir sulygiuotos. (2) Mode tiles iskirpti is pilno sheet (be ikeptu sekciju etiketu), uniform; selected naudoja ACTIVE variacija (ne geltonas apvedimas). (3) CTA 'Pradeti kova' mazesnis (maxWidth 300) ir zemiau, lengvesnis seselis (be tamsiu galu artefaktu). (4) press-flash (-hi highlight) veikia VISOMS quick kortelems (.rvn-imgcard:active .hi). tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause

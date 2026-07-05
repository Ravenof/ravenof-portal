@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/components/digital/DigitalHub.tsx
git add git-commit372.bat
echo === Commit ===
git commit -m "feat(economy phase1b): valiutu juosta meniu (Sidabras/Rubinai/Esencija) is getBalances. DigitalHub virsuje 3 valiutu bar. Match wiring i reportMatchV2 atidetas i Phase 2 kad nesulauzytu esamu level-up rewards (20260804). tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. =============
pause

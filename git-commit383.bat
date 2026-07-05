@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/components/digital/DigitalHub.tsx
git add src/app/digital/layout.tsx
git add src/lib/gamification/monthlyLogin.ts
git add src/components/digital/SeasonPathModal.tsx
git add src/components/tutorial/TutorialGame.tsx
git add git-commit383.bat
echo === Commit ===
git commit -m "fix(economy UI): (1) Sidabras ikona 🪙->🥈 (valiutu juosta/header/rewardChip/season unlock/kovos svente; musio gold lieka 🪙); (2) pasalintas senas login streak RewardBanner (dublikatas su nauju menesio login); (3) parduotuve grazinta i StoreModal (tikri items/paveikslai/daily deal vietoj generic shop_items placeholder); (4) pasalintas Kosmetika mygtukas is pagrindinio hub. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. =============
pause

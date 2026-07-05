@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/components/tutorial/TutorialGame.tsx
git add git-commit374.bat
echo === Commit ===
git commit -m "feat(economy phase2b): TutorialGame kovos (bot/unranked) prijungtos prie reportMatchV2. Sesijos refs (matchStart+clientMatchId, reset initGame -> idempotencija+replay). Pakeisti seni awardGold+reportMatchXp vienu v2 efektu (config reiksmes, validumas dur>=180 ARBA turns>=5 ARBA abu veiksmai>=3, dienos cap, level rewards). Ranked lieka RankedClient. Sventes modalas: +Sezono XP zetonas, nauji level reward zetonai (Sidabras/Esencija/Rubinai/pakai/nugareles), validus tik jei valid. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. =============
pause

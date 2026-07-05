@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/app/admin/economy/page.tsx
git add src/app/admin/economy/EconomyConfigClient.tsx
git add src/app/admin/page.tsx
git add git-commit381.bat
echo === Commit ===
git commit -m "feat(economy phase9): admin ekonomikos config redaktorius. /admin/economy - visi economy_config raktai (match_rewards/validity/streak/level_rewards/daily_chest/reroll/season_path/craft) redaguojami kaip JSON su validacija+save (admin RLS). Nuoroda i /admin/shop prekems. NAV +Ekonomika. Table-based (daily_task_templates/monthly_login_rewards/cosmetics) - DB/esami admin. tsc svarus. EKONOMIKOS OVERHAUL 9 FAZES BAIGTA."
echo === Push ===
git push
echo.
echo ============= BAIGTA. =============
pause

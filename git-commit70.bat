@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
del /f /q _coin.png _coin_g.png _coin2.png _cv.png _cost_tiles.png _sheet_test.png _costsheet_00.png _costsheet_01.png 2>nul
for %%i in (_costsheet_*.png) do del /f /q "%%i" 2>nul
(
git add src/app/admin/cards/actions.ts src/components/admin/CardStatsGrid.tsx src/app/admin/cards/stats/page.tsx src/app/admin/cards/page.tsx git-commit70.bat
git commit -m "feat(admin): greitas statu suvedimo puslapis su korta paveikslais - tinklelis (paveikslas + kaina/retumas/ATK/HP/tipas), inline auto-save (quickUpdateCardStats); filtrai pagal frakcija ir 'tik be kainos/retumo'"
git push
) > commit70.log 2>&1

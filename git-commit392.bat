@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/components/tutorial/BattleLayout.tsx
git add git-commit392.bat
echo === Commit ===
git commit -m "feat(combat F3): ranka landscape overlay. Ranka perkelta is board <section> (overflow-hidden karpe hover-lift/veduokle) i isorini absolute overlay per visa apacia - Hearthstone-stiliaus persidengia su lentos apacia mazam aukstyje. Board grid gauna bottom padding, kad tavo avataras/mana nebutu uzdengti. Drag logika nekeista (viewport coords + rectOf, layout-independent). tsc svarus." > commit392.log 2>&1
echo === Push ===
git push >> commit392.log 2>&1
type commit392.log
echo.
echo ============= BAIGTA (F3). =============

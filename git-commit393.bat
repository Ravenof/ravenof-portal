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
git add src/components/tutorial/TutorialGame.tsx
git add git-commit393.bat
echo === Commit ===
git commit -m "feat(combat F4): timer ziedas aplink apvalu BAIGTI EJIMA. Naujas TurnRing (SVG stroke-dashoffset) naudoja esama turnDeadline (120s, tik vsRemote/ranked; bot/tutorial/campaign = null -> ziedo nera, kad nekliudytu mokymuisi). Danger raudona kai <20s. Desine pile'ai/discard-for-gold jau vietoj. tsc svarus." > commit393.log 2>&1
echo === Push ===
git push >> commit393.log 2>&1
type commit393.log
echo.
echo ============= BAIGTA (F4). =============

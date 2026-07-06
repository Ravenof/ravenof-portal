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
git add git-commit390.bat git-commit391.bat git-commit392.bat git-commit393.bat git-commit394.bat git-commit395.bat
echo === Commit ===
git commit -m "feat(combat F1-F5): horizontal (landscape) combat layout uz ?layout=h. Naujas BattleLayout.tsx (pure layout, grid: kaire rail / lenta / desine pile'ai) is esamu render helper'iu perduodamu props'ais - engine/state/FX lieka TutorialGame. F1 skeleton+flag; F2 zonos+visi data-tut anchor'ai (ai-area!)+TAVO EJIMAS divideris; F3 ranka isorinis overlay (nekarpo hover-lift/drag); F4 timer ziedas aplink apvalu BAIGTI EJIMA (turnDeadline, tik PvP/ranked); F5 preview panele (hoverCard) + radialinis emote ratas (5s cd, burbulas 3s, PvP broadcast 'emote' backward-safe). Seni isTouch/!isTouch blokai gate'inti !useHLayout - be flago nepakite. tsc svarus. Liko: F6 FX rectOf auditas, F7 mobile orientation lock, F8 tutorial patikra, F9 cleanup." > commit395.log 2>&1
echo === Push ===
git push >> commit395.log 2>&1
type commit395.log
echo.
echo ============= BAIGTA (F1-F5). =============

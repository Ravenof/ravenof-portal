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
git add git-commit402.bat
echo === Commit ===
git commit -m "feat(combat H v2): Hearthstone-inspired redizainas (playtest feedback). (1) Virsutinis banner (Kova pries.../sound/log/settings) pasalintas H rezime - vietoj jo minimalus floating mygtukai (garsas+uzverti) top-right; +vietos lentai. (2) Priesio avataras perkeltas i pati virsu-centra. (3) Artefaktai IR reakcijos - tiek mano tiek priesio - kiekvienas sava atskira eile (vietoj inline su avataru). (4) Kompaktiska ranka (handW 54) + maZesnis rezervas; tap atidaro esama handExpanded didele korta perziura (Hearthstone tap-to-expand, uzdengia hero). (5) Avatarai scale 0.68. tsc svarus. LIKO: collapsible emote/log rail." > commit402.log 2>&1
echo === Push ===
git push >> commit402.log 2>&1
type commit402.log
echo.
echo ============= BAIGTA (H v2). =============

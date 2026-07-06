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
git add git-commit399.bat
echo === Commit ===
git commit -m "fix(combat H): playtest #1 pataisos. (1) desiniu pile'u (kalade/kapinynas/zmk) crop - platesnis desinys stulpelis clamp(140,16vw,206)+pile w40+maZesni tarpai. (2) pasalinta preview panele kaireje (long-press jau atidaro kortos detales) - zurnalas uzima visa auksta. (3) desinysis kolapsuotas log (fixed right-1) gate'intas !useHLayout - nebera log dubliu (kaire+desine). (4) lauko korta - kompaktiskas vertikalus 52px slotas (renderFieldH) vietoj 244px horizontalaus, nebeoverlapina units; board grid gauna kairini padding jam. (5) kompaktiskesnis vertikalus spacing + maZesni avatarai (scale 0.82) kad avatarai+artefaktu/reakciju zonos tilptu. tsc svarus." > commit399.log 2>&1
echo === Push ===
git push >> commit399.log 2>&1
type commit399.log
echo.
echo ============= BAIGTA (H fix #1). =============

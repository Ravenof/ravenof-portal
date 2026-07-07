@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/tutorial/BattleLayout.tsx
git add src/components/tutorial/TutorialGame.tsx
git add git-commit439.bat
git commit -m "fix(combat): musio zurnalas isbaigtas + lauko kortos rodymas (playtest feedback). ZURNALAS: issiskleides nebe spraudziamas i siaura kairiaja juosta (atrode neisbaigtas) - dabar PLATUS drawer min(340px,44vw) virs lentos su antraste, X mygtuku ir backdrop: BAKSTELK BET KUR SALIA (arba brauk kairen) - susitraukia; auto-scroll i naujausius irasus atsidarius ir augant logui; irasu miniatiuros 18->26px, tekstas 10->11px nebe truncate (drawer plotis leidzia pilna sakini). Mini strip kaireje lieka kaip buvo (bakst -> drawer). LAUKO KORTA: kai turi art - rodomas svarus vaizdas be uzraso ant virsaus (bakst = inspect, kuris uzsidaro bakstelejus bet kur); vardas rodomas tik kortoms be paveikslo (violetinis fonas per visa slota vietoj 7px juosteles). tsc+eslint svarus." > commit439.log 2>&1
git push >> commit439.log 2>&1
type commit439.log
echo ============= BAIGTA (combat log + field polish). =============

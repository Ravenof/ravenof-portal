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
git add git-commit404.bat
echo === Commit ===
git commit -m "feat(combat H v4): playtest feedback. (1) BAIGTI EJIMA mygtukas - be aukso viduj. (2) Po juo atskira aukso ikona (goldBar) tada parduoti korta +100. (3) Tavo avataras perkeltas i desini apatini lentos kampa (fieldo pusej, tuscioj erdvej prie pile'u). (4) RANKA perdaryta: maza apacioj, tempi auksTyn = zaidi (drag-to-play tiesiai is mazos), bakst = issiskleidzia didelis fanas (uzdengia artefaktus+dali padaru), bakst ant kortos = zaidi+sutraukia. Senas handExpanded bottom-sheet overlay PASALINTAS visai. tsc svarus." > commit404.log 2>&1
echo === Push ===
git push >> commit404.log 2>&1
type commit404.log
echo.
echo ============= BAIGTA (H v4). =============

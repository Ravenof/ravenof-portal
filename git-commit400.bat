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
git add git-commit400.bat
echo === Commit ===
git commit -m "fix(combat H): avatarai + artefaktu/reakciju zonos matomos zemam landscape aukstyje. Board 7 eiles -> 5: kiekvienos puses avataras+mana+artefaktai+reakcijos sujungti i VIENA eile (art/react slotai salia avataro -> aiskiai matomi). Flex justify-between per visa auksti (be alignContent:center clip). Landscape-mobile (hMobile=isTouch&&useHLayout) kompaktiski dydziai: handW 80->64, unitW 50->44, units row min-h 80->56; ?layout=v grazina senus dydzius. Avatarai scale 0.7, maZesnis hand reserve/overlay. tsc svarus." > commit400.log 2>&1
echo === Push ===
git push >> commit400.log 2>&1
type commit400.log
echo.
echo ============= BAIGTA (H fix #2 - avatarai+zonos). =============

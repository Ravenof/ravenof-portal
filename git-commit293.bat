@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit293.bat
git commit -m "feat(ui): sprinto badge + hand toggle (6,8/11). (6) Sprinto zenklas rodomas TIK kol sprintas aktyvus (u.summonedOnTurn === globalTurn) - po pirmo ejimo nusiima, nes sprintas nebeaktualus. (8) Atvertą ranką (touch) bakstelejus - susitraukia (simetriska: bakstelk = atverti / bakstelk vel = sutraukti); zaidziama vis tiek tempiant aukstyn. tsc svarus."
git push
) > commit293.log 2>&1

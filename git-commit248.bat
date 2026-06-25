@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/lib/tutorial/engine.ts src/components/tutorial/TutorialGame.tsx git-commit246.bat git-commit247.bat git-commit248.bat
git commit -m "perf+feat(battle): (1) PERF fix - parallax pointermove nebere-renderina viso TutorialGame (tilt perkeltas i OppHandFan local state); pradines rankos traukimas staggered (nesusikraunna i centra). (2) ZMK pranasumas/nepalankumas (poison ir t.t.): engine perduoda zmkPair/zmkPicked/bias; UI rodo 2 ZMK kortas - nepanaudota subyra i gabalus, panaudota lieka ir svyti."
git push
) > commit248.log 2>&1

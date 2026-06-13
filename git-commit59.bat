@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit59.bat
git commit -m "feat(game): ZMK traukimas su realia korta ir flip animacija (kaip taisykliu ZmkSimulator) - auto flash ir draw modalas rodo /rules/zmk nuotraukas (arba zmk_cards.image_url)"
git push
) > commit59.log 2>&1

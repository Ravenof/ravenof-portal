@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit54.bat
git commit -m "feat(game): zaidimas naudoja zaidejo issaugota prakeiksmu side decka (deck_cards is_side_deck), o ne visas curse kortas; main deck nebeimamas curses; DEMO islaiko fallback"
git push
) > commit54.log 2>&1

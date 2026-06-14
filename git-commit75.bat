@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/types.ts src/lib/game/effectEngine.ts src/lib/tutorial/engine.ts src/components/tutorial/TutorialGame.tsx git-commit75.bat
git commit -m "feat(gameplay): efektai revealOwnDeck / revealEnemyDeck - parodo N kalades virsutiniu kortu (tik perziurai, lieka kalades); modalas + AI pristabdymas"
git push
) > commit75.log 2>&1

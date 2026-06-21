@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/BattleFxLayer.tsx src/components/tutorial/TutorialGame.tsx git-commit201.bat
git commit -m "polish(fx): atakos lunge letesnis (0.52s su pauze prie taikinio) + impact garsas, baltas blyksnis ir lentos drebtelejimas smugio momentu (~220ms)"
git push
) > commit201.log 2>&1

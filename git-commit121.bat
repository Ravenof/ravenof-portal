@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/tutorial/TutorialGame.tsx
git commit -m "feat(game): zaidejas gali perziureti savo padetas reakcijas (peek, kaip kapinyna) - paspaudus savo reakcijos korta atsidaro pop-up su kortom; prieso reakcijos lieka paslepetos"
git push
git log -1 --oneline
) > commit121.log 2>&1

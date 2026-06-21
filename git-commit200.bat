@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/BattleFxLayer.tsx src/components/tutorial/TutorialGame.tsx git-commit200.bat
git commit -m "feat(fx): atakos lunge - paprastos atakos metu puolejo korta greit nuskrieja link taikinio ir grizta (BattleFxLayer.lungeUnit, CSS transform su krypties vars); tik attack ivykiams, ne efektams"
git push
) > commit200.log 2>&1

@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit182.bat
git commit -m "feat(ranked): ejimo laikmatis (120s, kaip unranked PvP) ir prie botu - auto-baigia ejima, antrasteje + ekrano centre ispejimas <=20s (tik zaidejo ejime); botu mastymo laikas sumazintas iki ~0.5-2s per veiksma/korta (vietoj 5-20s)"
git push
) > commit182.log 2>&1

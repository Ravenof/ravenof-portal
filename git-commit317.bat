@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit317.bat
git commit -m "feat(mobile): lauko korta -> fixed kairysis slotas (per viduri), board pastumtas i desine. Lauko korta pasalinta is vidurio juostos; dabar fixed kaireje-viduryje (veidrodis desines log juostos). Unit/zonu eiles gauna pl/pr paddingus (nesikerta su lauko slotu ir log). Kurinio slotas mobile 58->50 kad 5 tilptu be wrap tarp field ir log. Vidurio juosta = tik ivykiu tekstas (nebe overlap ant lauko kortos). tsc svarus."
git push
) > commit317.log 2>&1

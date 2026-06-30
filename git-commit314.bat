@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit314.bat
git commit -m "fix(avatars): miniaturos video atstatytas - pasalintas opacity/vidReady gating (jis ir buvo regresija nuo seamless crossfade). Video dabar rodomas tiesiai (position absolute inset0, fitStyle) virs portreto; portretas lieka apacioje kaip fallback (jokio juodo blyksnio nei play ikonos). Priverstinis play() per ref + onVid pranesa tevui esama vid (detailed view). tsc svarus."
git push
) > commit314.log 2>&1

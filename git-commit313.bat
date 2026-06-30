@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit313.bat
git commit -m "fix(avatars): miniaturoj video pasileidzia patikimai. Priverstinis v.play() per ref kai vid keiciasi; vidReady (matomumas) nustatomas is onLoadedData/onCanPlay/onPlaying + 700ms atsarginis taimeris - anksciau gating tik ant onPlaying galejo palikti video nematoma (opacity 0) jei eventas nesuveike. tsc svarus."
git push
) > commit313.log 2>&1

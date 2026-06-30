@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit304.bat
git commit -m "fix(avatars): portretas uzpildo visa rema + didesnis. AvatarFrame: portreto langas praplestas (T24.5/L24.5/R24/B29%) - portretas listas po remu, todel uzpildo visa matoma anga be tamsaus tarpo. Remas didesnis (102->122px base). tsc svarus."
git push
) > commit304.log 2>&1

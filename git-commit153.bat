@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/admin/GameplayConfigEditor.tsx src/components/tutorial/TutorialGame.tsx git-commit153.bat
git commit -m "fix(fx): ikelti summon efekto selektoriu (GameplayConfigEditor dropdown) ir trigeri+screen shake (TutorialGame) - liko neukomituoti is ankstesnio batch'o, todel dropdown nesimate admine"
git push
) > commit153.log 2>&1

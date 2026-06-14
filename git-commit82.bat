@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/admin/GameplayConfigEditor.tsx git-commit82.bat
git commit -m "ux(admin): logiskas efekto mapinimas - trigger -> efektas -> target priklauso nuo efekto; combat efektai gauna pilna target sarasa+selektorius+projectile/garsas; player/deck efektai tik player options; summon/draw/self - be target (summon zonu ticks); nelogiski laukai paslepti"
git push
) > commit82.log 2>&1

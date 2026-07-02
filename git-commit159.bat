@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/SummonBurst.tsx git-commit159.bat
git commit -m "feat(fx): summon efektu PREMIUM remake - iskvietimo magijos ratas (besisukancios runos, sakraline geometrija pentagrama/heksagrama/star12, zymes), charge->release timeline (energija renkasi i korta -> blyksnis -> sprogimas), sluoksniuotas bloom (shadowBlur), particle su trail+flicker, molten core plysiai, sesieliu tendriliai, light rays, lokalus vignette"
git push
) > commit159.log 2>&1

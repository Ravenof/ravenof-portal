@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/SummonBurst.tsx git-commit160.bat
git commit -m "feat(fx): summon efektai - 13 SKIRTINGU motyvu (flame/blast/ice/bolts/cloud/quake/rift/tendrils/souls/darkness/pulse/eruption/ritual) vietoj vienodo rato; + TURIS: daleliu gylio sluoksniai (z), tankus body puff sluoksnis masei, volumetric orb (3D rutulys) charge/release"
git push
) > commit160.log 2>&1

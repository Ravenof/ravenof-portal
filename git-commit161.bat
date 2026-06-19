@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/SummonBurst.tsx git-commit161.bat
git commit -m "feat(fx): ugnies motyvas perdarytas - volumetric kylantis/issiplecantis pliupsnis (ne plokscios liepsnos ant tieses); didesnis bendras mastas (maxR 340->520, plinta nuo kortos placiau), tankesne body mase, svelnesnis vignette"
git push
) > commit161.log 2>&1

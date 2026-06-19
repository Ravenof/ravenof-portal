@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/SummonBurst.tsx git-commit163.bat
git commit -m "feat(fx): pakelti likusius motyvus iki expanded/volumetric lygio (full pool) - tendrils stori svytintys sluoksniuoti, rift su vidiniu sukuriu+bloom, eruption didesni/gausesni spygliai, pulse su sklindanciu desaturacijos disku, quake storesni gausesni plysiai + molten centras"
git push
) > commit163.log 2>&1

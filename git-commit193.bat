@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/effectEngine.ts src/lib/tutorial/engine.ts src/components/tutorial/TutorialGame.tsx git-commit193.bat
git commit -m "fix(fx): pilno lauko AoE animacija veikia ir creature battlecry bei cempionu efektams - spawn kartą per paketa pagal aoeMode (>=3 taikiniai), nepriklauso nuo tgt; elementas perduodamas per zalos log us (__fxProjectile transientas applyMapping -> projectile damage log uose), tad battlecry/cempionu AoE gauna teisinga elementa ir spalva"
git push
) > commit193.log 2>&1

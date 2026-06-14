@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit80.bat
git commit -m "fix(practice): tuscias ekranas - prieso kalades uzklausa/buildDemoDeck klaida palikdavo oppCards=null ir game neinicijuodavo; pridetas catch+try fallback i mirror ir 'Ruosiama kova' loader vietoj tuscio"
git push
) > commit80.log 2>&1

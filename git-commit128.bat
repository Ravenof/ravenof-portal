@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/digital/PackOpen.tsx
git commit -m "fix(digital): pakuotes atplesimas patogesnis - tempk i SONA (pusinio plesimo uztenka) arba bakstelek, plius garantuotas 'Atplesti pakuote' mygtukas; nebegali nepavykti"
git push
git log -1 --oneline
) > commit128.log 2>&1

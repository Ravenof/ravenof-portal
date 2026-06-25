@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/digital/DigitalCollection.tsx src/components/tutorial/TutorialGame.tsx git-commit253.bat
git commit -m "perf(load): (1) Kolekcija - korteles nebevyniojam i GameCard (kiekvienas dejo matchMedia listener+shine -> simtai kortu = letas mount); img loading=lazy/decoding=async. (2) Zaidimo startas - 300 kortu su pilnu gameplay JSON kraunama TIK demo kaladei (prakeiksmams), tikrom kaladem nebe -> greitesnis start. Mazina ilgus delay'us ieinant i kortas / pradedant zaidima."
git push
) > commit253.log 2>&1

@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/DigitalHub.tsx
git add git-commit444.bat
git commit -m "fix(home): telefono spacing/overlap (feedback screenshot). PRIEZASTIS: apatine korteliu eile clamp(50px,11vh,84px) realiam telefonui (461px CSS) gaudavo ~50px, o turinys (KOSMETIKA caption+title+sub) ~66px - overflow-hidden kirpo teksto VIRSU per puse (atrode kaip persidengimas su Dienos uzduotimis). FIX: eile clamp(66px,13vh,92px) + caption fontas vh-responsive. DIENOS UZDUOTYS: eilutes kompaktiskos vh vienetais (padding/gap/progress bar/fontai skalauja su ekrano auksciu) - 3 uzduotys telpa be nukirpimo zemame ekrane; PERZIURETI mygtukas kompaktesnis. tsc+eslint svarus." > commit444.log 2>&1
git push >> commit444.log 2>&1
type commit444.log
echo ============= BAIGTA (home spacing fix). =============

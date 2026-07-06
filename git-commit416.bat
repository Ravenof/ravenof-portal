@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/DigitalPvP.tsx
git add git-commit416.bat
git commit -m "feat(pvp): Draugiska kova - vieno ekrano landscape pasiruosimas (pagal reference). 3 stulpeliai: Tavo kalade (karusele+Keisti) / Priesininko tipas (3 tabai: Atsitiktinis=findRandom, Pakviesti drauga=draugu sarasas+challengeCreate kvietimas, Kambario kodas=sukurti/prisijungti) / Kovos santrauka (kalade/rezimas/rangas nesikeicia/atlygis/priesininkas). Match logika (findRandom/createPrivate/joinByCode/waitForGuest/launch) portinta inline is PvPLobby -> startas TutorialGame(net). CTA visada matomas apacioj, tekstas pagal busena (PASIRINK KALADE/IESKOTI VARZOVO/SIUSTI KVIETIMA/SUKURTI KAMBARI/PRISIJUNGTI/LAUKIAMA). ?join/?host deep-linkai issaugoti. tsc svarus." > commit416.log 2>&1
git push >> commit416.log 2>&1
type commit416.log
echo ============= BAIGTA (PvP landscape). =============

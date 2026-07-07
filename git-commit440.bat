@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/DigitalPvP.tsx
git add src/components/digital/DigitalPvE.tsx
git add src/components/digital/ranked/RankedClient.tsx
git add git-commit440.bat
git commit -m "polish(mode-menus): 3 kovos rezimu meniu pro-design perziura (Chrome QA). DRAUGISKA: CTA nebe atskiras apatinis baras (nesutapo su kitu ekranu pattern'u) - IESKOTI VARZOVO perkeltas i Kovos santraukos panele apacioj kaip Ranked/Treniruoteje, Atsaukti rodomas tik kai yra kambarys; pasalintas perteklinis 'Keisti kalade' mygtukas (sarasas ir taip selektorius) - kaladziu sarasas gauna visa auksti. RANKED: statistikos plyteles ispildo visa kairiosios paneles auksti (grid-rows-2 flex-1, skaiciai iki 30px) - nebera tuscio ploto virs/po; rango zenklelis 56->74; desines gift 64->88; kaladziu karusele gavo desiniojo krasto fade gradienta + 'slink ->' uzuomina (nebuvo aisku kad daugiau kaladziu). TRENIRUOTE: tuscias tarpas tarp AI sunkumo ir CTA uzpildytas 'Kovos atlygis' bloku (pergale silver+XP, skaitosi uzduotims/sezonui; be rizikos rangas nesikeicia) - desine panele nebeatrodo pustuste. + pre-existing eslint klaidos isvalytos (unused RvnIcon/desc, unescaped quotes). tsc+eslint svarus." > commit440.log 2>&1
git push >> commit440.log 2>&1
type commit440.log
echo ============= BAIGTA (mode menus pro polish). =============

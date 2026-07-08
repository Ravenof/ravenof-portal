@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/DigitalDeckBuilder.tsx
git add src/components/digital/DigitalDecks.tsx
git add git-commit452.bat
git commit -m "fix(deck-builder v5.2): kalades sarasas VISADA matomas + Redaguoti veikia. (1) SARASO NEBUVO telefone: desines paneles shrink-0 elementai (vardas+Privati/Viesa+aprasymas+kreive+Issaugoti) suvalgydavo visa auksti ir flex-1 sarasas susispausdavo iki 0px. Fix: vardas+matomumo ikona (lock/gaublys toggle)+aprasymo pieštukas VIENOJE eileje (vietoj 3 eiluciu ~120px -> 32px), aprasymo input tik paspaudus pieštuka, kreive clamp(20,4vh,34), o sarasui garantuotas minHeight 96px - fiziskai nebegali dingti. (2) REDAGUOTI NEVEIKE: router.push keicia tik URL query, komponentai nepersimontuoja - DigitalDecks dabar sinchronizuoja tab i initialTab per useEffect(initialTab, initialDeck.id), o builder store perkraunamas kai pasikeicia initialDeck.id. tsc+eslint svarus." > commit452.log 2>&1
git push >> commit452.log 2>&1
type commit452.log
echo ============= BAIGTA (builder v5.2). =============
pause

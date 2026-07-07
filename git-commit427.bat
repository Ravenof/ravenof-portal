@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/DigitalDeckBuilder.tsx
git add src/components/digital/DailyTasksModal.tsx
git add src/components/digital/DigitalMyDecks.tsx
git add git-commit427.bat
git commit -m "fix(landscape QA): Chrome perziuros pataisos. (1) KRITINE deck builder albumo: CardTile Thumb size=9999 rodydavo milzinigai priartinta kortos kampa (pilkos demes) - Thumb gavo fill rezima (absolute inset-0), plyteles dabar rodo tikra kortos vaizda + prideta kaina (aukso zenkliukas) ir vardo juosta apacioj + xN kalades badge. (2) DailyTasksModal: kai uzduociu sarasas tuscias - aiskus empty state (Siandien uzduociu nera / naujos 00:00) vietoj tuscio ploto. (3) Mano kalades: lentynos po 3 -> po 5 (grid-cols-5) - landscape rezime kalades nebera per didziules, lentyna telpa ekrane. tsc svarus." > commit427.log 2>&1
git push >> commit427.log 2>&1
type commit427.log
echo ============= BAIGTA (QA pataisos). =============

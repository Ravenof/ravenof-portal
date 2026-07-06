@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/ranked/RankedClient.tsx
git add git-commit413.bat
git commit -m "feat(ranked): landscape lobby redizainas pagal reference. Home view = 3 stulpeliai (kaire sezono statistika 2x2 + gauta XP/auksas; centras rango zenklelis + progresas + 'iki rango kritimo' + didelis IESKOTI KOVOS CTA + pasirinkta kalade; desine RANKED ATLYGIAI + kitas atlygis + skrynia + PERZIURETI ATLYGIUS) + apacioj REITINGO KALADES horizontali karusele (pasirinkta = raudonas border+check). Antrastej sezonas+laikas + kompaktiski nav ikonu mygtukai (topas/kovos/pasiekimai/sezonai). h-full telpa be scroll. Pasalinti nenaudojami DeckSelect/PageHero/OctPanel/navBtn. tsc svarus." > commit413.log 2>&1
git push >> commit413.log 2>&1
type commit413.log
echo ============= BAIGTA (ranked landscape). =============

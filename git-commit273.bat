@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add supabase/migrations/20260718_starter_decks_8.sql
git add src/lib/starterDecks.ts
git add src/components/tutorial2/TutorialHub.tsx
git add git-commit273.bat
echo === Commit ===
git commit -m "feat(starter decks): 8 frakciju starter kalades + tutorial graduation. (1) 20260718: pakeicia auto-seedintas atsitiktines 8 kuruotomis frakciju kaladems (6-13, po 15 pigiausiu ne-cempionu x2 = 30), price_gold 1500; claim RPC perdarytas - PIRMA zaidejo kalade NEMOKAMA (tutorialo pasirinkta), likusios uz auksa; rvn_get_starter_decks grazina factionId. Vardu match nepatikimas (Korkodeg ir kt. nera DB), todel kalades statomos is frakcijos kortu - garantuotai pilnos. (2) TutorialHub: po 5 pamoku - 'Pasirink starter kalade' picker -> claim nemokamai -> egzamino kova (TutorialGame practice) su pasirinktu deck pries ATSITIKTINE starter frakcija. Shop jau rodo starter kalades (StoreModal) - 8 atsiras automatiskai. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause

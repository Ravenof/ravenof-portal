@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add supabase/migrations/20260719_starter_decks_deckid.sql
git add src/lib/starterDecks.ts
git add src/components/tutorial2/TutorialHub.tsx
git add src/components/tutorial/TutorialGame.tsx
git add git-commit275.bat
echo === Commit ===
git commit -m "feat(tutorial): naudoti REALIAS starter deck kortas (ne TUT). Tutorial = pasirink 1 is 8 starter kaladziu -> gauni nemokamai -> vedamas musis (TutorialGame GUIDED_STEPS) su tom kortom pries ATSITIKTINE starter frakcija. (1) TutorialHub perrasytas: starter deck picker -> claim (pirma nemokama) -> launch TutorialGame su tikru deckId + random opponentFaction. Nebenaudoja TUT korteliu/director/5 pamoku. (2) 20260719: rvn_get_starter_decks grazina ir claimed deckId (replay'ui). (3) starterDecks type: + factionId/deckId. (4) TutorialGame loadOpp: priesa kraunam ir kai nurodytas opponentFaction/opponentDeckId (kad guided musis turetu random priesa, ne veidrodi). tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause

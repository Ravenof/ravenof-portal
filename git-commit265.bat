@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add supabase/migrations/20260714_campaign_card_rescale.sql
git add supabase/migrations/20260715_campaign_reuse_existing_cards.sql
git add git-commit265.bat
echo === Commit ===
git commit -m "feat(campaign): kortu kainu rescale i 100-900 framework + panaudoti esamas veikeju kortas story-kaladese. (1) 20260714: VRN kortu gold_cost *100 (1-9 -> 100-900), kad atitiktu pagrindinio zaidimo galios framework (idempotentiska). (2) 20260715: story-kaladese VRN dublikatai pakeisti JAU egzistuojanciomis kortomis kur frakcija sutampa: Gunteris->Gunteris Narsusis, Doriana->Doriana Ugningoji, Alarikas->Alarikas Teisusis, Konstancijus->Tevas Konstancijus. Lieka VRN: Prazaras(zmogus VRN-001), Madelius, Eleonora, Saldas, Ema, Tautvydas + generiniai gynejai. Demonai jau naudojami per Demonu ordos frakcija."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause

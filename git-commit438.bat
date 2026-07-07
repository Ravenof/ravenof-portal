@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git rm -f --ignore-unmatch "src/components/digital/StoreModal.tsx" >nul 2>&1
git add src/components/digital/ShopModal.tsx
git add src/app/digital/layout.tsx
git add src/components/digital/DigitalHub.tsx
git add git-commit438.bat
git commit -m "feat(shop): parduotuviu KONSOLIDACIJA - viena vieninga parduotuve. Rasta: naujoji multi-valiutes ShopModal (Phase 6) buvo importuota bet NIEKUR nerenderinta - zaidejai vis dar mate tik sena auksine StoreModal! Dabar: ShopModal = vienintele parduotuve (tab bar Parduotuve + Hub + requestOpenStore eventas), papildyta dviem sekcijom is senosios: DIENOS KORTOS (daily deal su kortu vaizdais, perka rvn_buy_daily_deal_card) ir STARTER KALADES (nemokamos/mokamos, claimStarterDeck) - abu su dideliu preview desineje ir Pirkti CTA pinned; + Atplesti (N) paku CTA kaireje apacioje; Esc uzdarymas; auto-select pirmos prekes. Senas StoreModal.tsx PASALINTAS (git rm). layout/Hub perjungti, nebenaudojamas wallet gold prop. tsc svarus, eslint 0 errors." > commit438.log 2>&1
git push >> commit438.log 2>&1
type commit438.log
echo ============= BAIGTA (parduotuviu konsolidacija). =============

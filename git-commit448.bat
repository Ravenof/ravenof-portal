@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add supabase/migrations/20260825_shop_cleanup.sql
git add src/components/digital/ShopModal.tsx
git add git-commit448.bat
git commit -m "fix(shop): placeholder'iai LAUK + viena kaladziu kategorija (feedback). Migr 20260825: 8 placeholder prekes (basic/rare/premium/legendary nugareles+avatarai) deaktyvuotos BESALYGISKAI - shope lieka tik tikri daiktai; pakartotinis tikros kosmetikos sync pagauna ir admin'e VELIAU pridetus daiktus (idempotentiskas, galima kartoti kiekvienam run-migrations). SHOPMODAL: 'Kalades' DB sekcija PASALINTA (faction_deck/bundle prekiu niekada nebuvo seed'inta - tuscia kategorija klaidino), Starter kalades pervadintos i 'Kalades' - liko viena kaladziu kategorija. REIKIA run-migrations.bat (20260824+20260825). tsc+eslint svarus." > commit448.log 2>&1
git push >> commit448.log 2>&1
type commit448.log
echo ============= BAIGTA (shop cleanup). =============

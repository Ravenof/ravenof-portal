@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add supabase/migrations/20260826_shop_real_packs.sql
git add src/components/digital/ShopModal.tsx
git add git-commit449.bat
git commit -m "feat(shop): TIKRI boosters parduotuveje - Tamsos aliansas ir Gerio gynejai (feedback). Problema: grant variklis pakus rinkdavo tik pagal raktazodzius (rare/champion->paskutinis, kiti->pirmas) - konkretaus card_pack parduoti nebuvo imanoma, o seed shop pakai (standard/faction/rare/champion/10x) buvo fiktyvus. Migr 20260826: (1) rvn__grant_reward_payload (baze = NAUJAUSIA 20260816 versija, atminties ispejimas issaugotas) pack sakoje PIRMA bando tiesiogini card_packs.id uuid match, tik tada sena heuristika - reward payload'ai (standard_pack is level/login/chest) veikia kaip anksciau; (2) visi aktyvus card_packs sync'inami i shop_items (payload item_id = tikras uuid, silver=price_gold + rubinai ~12 proc.) - nauji admin pakai atsiras per run-migrations; (3) 5 fiktyvus seed pakai deaktyvuoti. SHOPMODAL: pack prekes rodo TIKRA pakuotes virseli (getActivePacks image_url) plytelese 74x96 ir desineje 132x172. REIKIA run-migrations.bat (20260826). tsc+eslint svarus." > commit449.log 2>&1
git push >> commit449.log 2>&1
type commit449.log
echo ============= BAIGTA (tikri boosters shope). =============

@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add supabase/migrations/20260815_shop.sql
git add src/lib/gamification/shop.ts
git add src/components/digital/ShopModal.tsx
git add src/components/digital/DigitalHub.tsx
git add src/app/digital/layout.tsx
git add git-commit378.bat
echo === Commit ===
git commit -m "feat(economy phase6): parduotuve multi-valiute (Sidabras/Rubinai). migr 20260815: shop_items + shop_item_prices (currency silver|rubies|real_money; joks daiktas NE tik real_money) + user_shop_purchases; seed pagal spec (pakai/nugareles/avatarai/rubiu bundle). rvn_get_shop + rvn_purchase_shop_item (atomiskas, real_money->iap_required). SVARBU: grant_reward_payload PERKURTA - pakai mapinami i realu card_pack ir deda i user_pack_inventory (dabar VISI pak atlygiai is level/login/daily/season ATPLESIAMI). shop.ts + ShopModal.tsx (sekcijos, kainu mygtukai, likutis). DigitalHub+layout StoreModal->ShopModal. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. =============
pause

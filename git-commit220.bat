@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add supabase/migrations/20260628_shop_starter_decks.sql src/lib/starterDecks.ts src/lib/cosmetics.ts src/components/digital/StoreModal.tsx src/components/admin/ShopImageUpload.tsx src/app/admin/shop/page.tsx src/app/admin/shop/AdminShopClient.tsx src/components/digital/DigitalHub.tsx src/app/admin/page.tsx git-commit220.bat
git commit -m "feat(shop): vieninga PARDUOTUVE su kategoriju filtru (pakuotes/dienos kortos/starter kalades/kosmetika), starter kalades po 0 gold (kortos i kolekcija + paruosta kalade), admin /admin/shop CRUD (kosmetika+pakuotes+starter su kortu rinkikliu) ir paveiksliuku ikelimas. Migr 20260628: starter_decks/_cards/_claims + RPC, cosmetics.image_url + admin RLS"
git push
) > commit220.log 2>&1

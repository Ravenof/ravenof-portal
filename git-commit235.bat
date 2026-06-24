@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add supabase/migrations/20260703_auction_house.sql src/lib/market.ts src/components/market/MarketClient.tsx src/app/market/page.tsx src/components/digital/DigitalHub.tsx git-commit235.bat
git commit -m "feat(market): aukcionas (auction house) - fiksuota kaina auksu + escrow. /market puslapis (narsyti su paieska pagal korta/pardaveja, parduoti is kolekcijos, mano listingai su atsaukimu). RPC list/cancel/buy/browse/my (atominis pirkimas, korta+auksas persikelia). Listingai kabo nors user offline. Hub plytele"
git push
) > commit235.log 2>&1

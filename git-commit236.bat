@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add supabase/migrations/20260704_card_trades.sql src/lib/trade.ts src/components/social/TradeWindow.tsx src/components/social/FriendsClient.tsx git-commit236.bat
git commit -m "feat(trade): realaus laiko korta<->korta mainai su pop-up. card_trades + RPC (create/accept/set_offer/confirm su atominiu apsikeitimu/cancel/get). TradeWindow (abu deda kortas, polling sync, abu patvirtina -> swap; nuosavybe validuojama vykdymo metu). Friends: Mainai mygtukas + mainu pasiulymu inbox"
git push
) > commit236.log 2>&1

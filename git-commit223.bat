@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add supabase/migrations/20260630_daily_deal_fix.sql src/lib/economy.ts src/components/digital/StoreModal.tsx git-commit223.bat
git commit -m "fix(shop): dienos kortu fix (patikimas md5 parinkimas vietoj setseed/bit) + parduotuves redizainas - visos prekes viename tinklelyje (kvadratai: didelis pic + pavadinimas/kaina apacioj), filtrai virsuje digital-portal stiliumi, pirkimas integruotas i plytele"
git push
) > commit223.log 2>&1

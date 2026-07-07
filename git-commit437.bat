@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add supabase/migrations/20260823_economy_balance_v2.sql
git add git-commit437.bat
git commit -m "feat(economy): balanso v2 migracija (auditas patvirtintas). A) Kovos vertingesnes: unranked win 35->60/loss 10->15, ranked 50->80/15->25, bot 20->30/5->8 - zaidimas nebeuzdirba maziau nei login'as (6 kovos ~250-400s vs buves 135s). B) Craft: legendine 3200->2400, cempionas 4800->3600 esencijos (~24/36 d pity kelias). C) Dienos deal: epic 600->900, legendine 1500->2600s (nebezudo craft prasmes). D) Premium kosmetika TIK uz rubinus: 2 nugareles (600r/350r) + avataras (800r) - rubiai igauna tiksla pries IAP; cosmetics.is_shop_exclusive + rvn_get_cosmetics rodo exclusive tik turintiems. BONUS: retro-sync pre-Phase7 user_inventory kosmetika -> user_cosmetics (grant funkcija is 20260816 NELIECIAMA - ji jau tiltuoja teisingai; pirmine mano versija butu regresine, atmintis isgelbejo). REIKIA run-migrations.bat (20260823)." > commit437.log 2>&1
git push >> commit437.log 2>&1
type commit437.log
echo ============= BAIGTA (ekonomikos balansas v2). =============

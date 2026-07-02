@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add supabase/migrations/20260617_pack_open.sql
git commit -m "fix(db): rvn_open_pack - rarities.id yra integer, ne uuid (v_rarities int[], v_rar int). Pataiso 'invalid input syntax for type uuid' atplesiant pakuote"
git push
git log -1 --oneline
) > commit130.log 2>&1

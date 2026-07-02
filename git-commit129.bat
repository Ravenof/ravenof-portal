@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/digital/PackOpen.tsx supabase/migrations/20260617_pack_open.sql
git commit -m "fix(digital): pakuotes atplesimas - rodo tikra klaida; rvn_open_pack insert i user_collections su updated_at (galima nesekme jei stulpelis NOT NULL be default)"
git push
git log -1 --oneline
) > commit129.log 2>&1

@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add supabase/migrations/20260617_pack_open.sql src/components/digital/PackOpen.tsx
git commit -m "fix(db): rvn_open_pack unnest stulpelio aliasas u(cid) - pataiso 'column cid does not exist'"
git push
git log -1 --oneline
) > commit134.log 2>&1

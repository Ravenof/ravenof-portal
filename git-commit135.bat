@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add supabase/migrations/20260617_pack_open.sql src/lib/economy.ts src/components/digital/PackOpen.tsx
git commit -m "fix(digital): perdarytas booster opening - RPC rvn_open_pack grazina uuid[] (minimalus SQL, be trapaus return join), kortu detales paima klientas ta pacia uzklausa kaip albumas; pataiso 'column does not exist'"
git push
git log -1 --oneline
) > commit135.log 2>&1

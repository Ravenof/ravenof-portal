@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add supabase/migrations/20260617_pack_open.sql src/lib/economy.ts src/components/digital/PackOpen.tsx src/components/digital/DigitalHub.tsx
git commit -m "feat(digital): ekonomika FAZE 2 - pakuociu atplesimas. RPC rvn_open_pack (svorinis retumu RNG pagal sort_order: daznas=didziausias svoris 5/4/3/2/1), prideda 10 kortu i user_collections + log. UI: tempk pirstu nuplesk virsu (drag-to-tear), tada 10 kortu flip-reveal su retumo svytejimu. Store 'Atplesti pakuote' mygtukas"
git push
git log -1 --oneline
) > commit125.log 2>&1

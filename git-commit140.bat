@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add supabase/migrations/20260617_pack_open_v2.sql src/lib/economy.ts
git commit -m "fix(digital): pakuotes atplesimas - nauja funkcija rvn_open_pack_v2 (naujas pavadinimas, tik patikrinti stulpeliai, be DROP/return-type konflikto), klientas kvieca v2"
git push
git log -1 --oneline
) > commit140.log 2>&1

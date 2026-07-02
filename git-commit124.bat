@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add supabase/migrations/20260617_digital_economy.sql src/lib/economy.ts src/components/tutorial/TutorialGame.tsx src/components/digital/DigitalHub.tsx
git commit -m "feat(digital): ekonomika FAZE 1 - auksas (profiles.gold), apdovanojimai uz pergale (PvE easy10/normal20/hard50, PvP unranked 100), parduotuve (pirk pakuote uz 200 auksa), aukso+pakuociu balansas hub'e, 'Mano kortos' -> 'Virtualios kortos'. RPC rvn_award_gold/rvn_buy_pack (migracija). Pakuociu atplesimas - FAZE 2"
git push
git log -1 --oneline
) > commit124.log 2>&1

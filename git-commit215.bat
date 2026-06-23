@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add supabase/migrations/20260625_pvp2v2_rooms.sql src/lib/team2v2/pvp.ts src/components/digital/Team2v2Game.tsx src/components/digital/DigitalPvp2v2.tsx src/app/digital/pvp2v2/page.tsx src/components/digital/DigitalHub.tsx git-commit215.bat
git commit -m "feat(2v2 PvP): 4 tikru zaideju 2v2 - pvp2v2_rooms lentele + matchmaking RPC (create/quick/join_code/join_room/leave), pvp.ts klientas (RPC apvalkalai + 1 zaidejo kalades uzkrovimas + net protokolas), Team2v2Game net rezimas (host-authoritative broadcast: hostas laiko kanonine busena, klientai siuncia veiksmus, UI persiorientuoja pagal viewSeat), DigitalPvp2v2 lobi (greita paieska/privatus/kodas + 4 vietu laukimo kambarys) + hub plytele. tsc svarus"
git push
) > commit215.log 2>&1

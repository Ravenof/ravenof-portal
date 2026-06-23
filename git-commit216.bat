@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add supabase/migrations/20260625_pvp2v2_rooms.sql src/lib/team2v2/pvp.ts src/components/digital/Team2v2Game.tsx src/components/digital/DigitalPvp2v2.tsx src/app/digital/pvp2v2/page.tsx src/components/digital/DigitalHub.tsx src/components/tutorial/TutorialGame.tsx git-commit215.bat git-commit216.bat
git commit -m "feat(2v2 PvP + UI): 4 tikru zaideju 2v2 (pvp2v2_rooms + matchmaking RPC, pvp.ts klientas, Team2v2Game net rezimas host-authoritative broadcast, DigitalPvp2v2 lobi, hub plytele) IR perdarytas 2v2 kovos laukas kaip 1v1 - tikros UnitTile/MiniCard/PileBack/HpVial kortos (eksportuotos is TutorialGame), laukas padalintas i dvi puses (tavo | sajungininkas; virsuj abu priesai), kiekvienas zaidejas turi sava Kalade/ZMK/Kapinyna, kapinyno perziura. tsc svarus"
git push
) > commit216.log 2>&1

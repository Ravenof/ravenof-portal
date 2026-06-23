@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add supabase/migrations/20260625_pvp2v2_rooms.sql src/lib/team2v2/pvp.ts src/components/digital/Team2v2Game.tsx src/components/digital/DigitalPvp2v2.tsx src/app/digital/pvp2v2/page.tsx src/components/digital/DigitalHub.tsx src/components/tutorial/TutorialGame.tsx git-commit215.bat git-commit216.bat git-commit217.bat
git commit -m "feat(2v2 PvP + 1v1 pojutis): 4 zaideju 2v2 PvP (pvp2v2_rooms + matchmaking RPC, pvp.ts klientas, Team2v2Game host-authoritative broadcast net rezimas, DigitalPvp2v2 lobi, hub plytele) + 2v2 laukas perdarytas kaip 1v1: tikros UnitTile/MiniCard/PileBack/HpVial kortos, drag-and-drop kortu zaidimas (tempk aukstyn i lauka), ZMK flip animacija is log, artefaktu+reakciju eilutes, kiekvienas zaidejas su sava Kalade/ZMK/Kapinynu, laukas i dvi puses (tavo|ally; virsuj abu priesai). zmkImg/UnitTile/MiniCard/PileBack/HpVial eksportuoti is TutorialGame. tsc svarus"
git push
) > commit217.log 2>&1

@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/digital/DigitalDecks.tsx src/components/digital/DigitalDeckBuilder.tsx src/components/digital/DigitalMyDecks.tsx src/components/digital/DigitalCommunityDecks.tsx src/app/digital/decks/page.tsx src/app/digital/deck/page.tsx src/app/digital/layout.tsx src/components/digital/DigitalHub.tsx src/components/digital/DigitalPvE.tsx src/components/digital/DigitalPvP.tsx src/components/digital/DigitalCoop.tsx src/components/digital/DigitalPvp2v2.tsx src/components/digital/ranked/RankedClient.tsx git-commit241.bat git-commit242.bat
git commit -m "feat(digital): Kaladziu hub /digital/decks (Faze 2) + PvE/PvP restyle. Segment tabs Deck Builder/Mano kalades/Bendruomene; mobile builder (frakciju korteles, Tik turimos+Universalios, owned+rarity limitas, list/grid, preview, sticky summary+validacija, Privati/Viesa); Mano kalades (valid badge, truksta, redaguoti/isbandyti, dubliuoti/trinti); Bendruomenes (paieska/sort/galiu susideti, detali owned/missing grayscale, kopijuoti). Treniruote + Draugiska kova ekranai perdaryti i nauja panel stiliu. Nav -> /digital/decks; /digital/deck redirectina. Jokio portal redirect."
git push
) > commit242.log 2>&1

@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/digital/DigitalDecks.tsx src/components/digital/DigitalDeckBuilder.tsx src/components/digital/DigitalMyDecks.tsx src/components/digital/DigitalCommunityDecks.tsx src/app/digital/decks/page.tsx src/app/digital/deck/page.tsx src/app/digital/layout.tsx src/components/digital/DigitalHub.tsx src/components/digital/DigitalPvE.tsx src/components/digital/DigitalPvP.tsx src/components/digital/DigitalCoop.tsx src/components/digital/DigitalPvp2v2.tsx src/components/digital/ranked/RankedClient.tsx src/components/digital/PvPLobby.tsx git-commit241.bat git-commit242.bat git-commit243.bat
git commit -m "feat(digital): Kaladziu hub /digital/decks (Faze 2) + kovos ekranu restyle. Decks hub segment tabs (Builder/Mano/Bendruomene); mobile builder (frakciju korteles, Tik turimos+Universalios, owned+rarity limitas, list/grid, preview, sticky summary+validacija, Privati/Viesa); Mano kalades; Bendruomenes (owned/missing grayscale, kopijuoti). Treniruote/Draugiska kova/Ranked deck-select + PvPLobby modalas perdaryti i rounded glass panel stiliu (maziau neon octagon). Nav -> /digital/decks; /digital/deck redirectina. Jokio portal redirect."
git push
) > commit243.log 2>&1

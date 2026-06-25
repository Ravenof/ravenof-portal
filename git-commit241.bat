@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/digital/DigitalDecks.tsx src/components/digital/DigitalDeckBuilder.tsx src/components/digital/DigitalMyDecks.tsx src/components/digital/DigitalCommunityDecks.tsx src/app/digital/decks/page.tsx src/app/digital/deck/page.tsx src/app/digital/layout.tsx src/components/digital/DigitalHub.tsx src/components/digital/DigitalPvE.tsx src/components/digital/DigitalPvP.tsx src/components/digital/DigitalCoop.tsx src/components/digital/DigitalPvp2v2.tsx src/components/digital/ranked/RankedClient.tsx git-commit241.bat
git commit -m "feat(digital): Kaladziu hub /digital/decks (Faze 2). Segment tabs: Deck Builder / Mano kalades / Bendruomene. Mobile Deck Builder (frakciju korteles, Tik turimos + Universalios toggle, owned+rarity limito enforcement, list/grid, preview, sticky summary + validacija, Privati/Viesa). Mano kalades (valid/invalid badge, ownership truksta, redaguoti/isbandyti, dubliuoti/trinti). Bendruomenes kalades (paieska/frakcija/sort, tik kurias galiu susideti, detali su owned/missing grayscale, kopijuoti i Mano kalades). Nav Kalades -> /digital/decks; /digital/deck redirectina i nauja hub. Jokio portal redirect."
git push
) > commit241.log 2>&1

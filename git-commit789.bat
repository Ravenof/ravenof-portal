@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/game/hiddenFactions.ts src/lib/digital/activeDeck.ts src/lib/ranked/client.ts src/lib/ranked/bots.ts src/lib/offline/warm.ts src/lib/cosmetics.ts src/lib/version.ts src/components/digital/DigitalPvE.tsx src/components/digital/DigitalPvP.tsx src/components/digital/PvPLobby.tsx src/components/digital/DigitalMyDecks.tsx src/components/digital/DigitalCommunityDecks.tsx src/components/tutorial/PracticeButton.tsx src/components/tutorial/TutorialGame.tsx src/components/tutorial/ArenaBackground.tsx src/app/digital/decks/page.tsx src/app/cards/page.tsx src/app/deck-builder/page.tsx src/app/deck-builder/[deckId]/page.tsx src/app/community-decks/page.tsx supabase/migrations/20261115_hide_rytu_vejas.sql supabase/migrations/_restore_rytu_vejas.sql git-commit789.bat
git commit -m "789: frakcija Rytu vejas laikinai paslepta is zaidimo - nerodoma frakciju sarasuose (DI varzovas, treniruote, kaladziu kurimas, kortu katalogas, bendruomenes kalades), jos kalades dingsta is kaladziu pasirinkimu, arena ir nugarele nebepatenka i atsitiktini parinkima, du botai laikinai zaidzia kitomis frakcijomis; kortos, pradine kalade, boosteriai ir nugarele slepiami migracija 20261115 (atstatymas _restore_rytu_vejas.sql)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2pquWqjVVw7HiXJktG"
git push
git log -1 --oneline
) > commit789.log 2>&1

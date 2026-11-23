@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/digital/DigitalMyDecks.tsx src/components/digital/DigitalDeckBuilder.tsx src/components/digital/DigitalCommunityDecks.tsx src/lib/digital/useStarterBoxes.ts src/locales/lt/decks.json src/locales/en/decks.json src/lib/version.ts git-commit828.bat
git commit -m "828: Mano kalades - dezutes be fono su glow, be skraidanciu kortu, be Isbandyti; builder frakcijos pasirinkimas starter dezutemis, Rytu vejas paslepta, New deck EN; bendruomenes kalades - nauja kortele su dezute, autoriaus avataru, vote pill; perziura su grid/list vaizdais, vertimai, kortos padidinimas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2q4xKtxDCTMeqeaDnr"
git push
git log -1 --oneline
) > commit828.log 2>&1

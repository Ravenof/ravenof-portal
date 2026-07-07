@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/DigitalDecks.tsx
git add src/components/digital/DigitalDeckBuilder.tsx
git add git-commit442.bat
git commit -m "fix(deck-builder): MAX naudingas plotas telefone (feedback: netelpa net viena kortu eile). Virs albumo buvo 4 juostos - segment tabai + DECK BUILDER title row + toolbar; dabar 1: (1) segment tabai (Deck Builder/Mano kalades/Bendruomene) builder rezime NEBERODOMI (~64px atgauta; back -> Mano kalades kur tabai matomi); (2) title row PASALINTA visai (~44px): back mygtukas perkeltas i filtru juostos pradzia, frakcijos chip nebereikalingas (select ja rodo), 0/30 skaitliukas ir taip yra Kalades paneleje, TESTER zenkliukas -> prie Kalades antrastes; (3) frakcijos pasirinkimo ekrane back idetas i jo antraste. Telefone dabar telpa ~2 kortu eiles vietoj vienos apkirptos. tsc+eslint svarus." > commit442.log 2>&1
git push >> commit442.log 2>&1
type commit442.log
echo ============= BAIGTA (deck builder max plotas). =============

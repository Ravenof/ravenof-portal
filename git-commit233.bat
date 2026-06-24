@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/lib/deckCode.ts src/components/my-decks/ShareCodeButton.tsx src/components/my-decks/DeckImportButton.tsx src/components/my-decks/MyDecksList.tsx src/app/my-decks/page.tsx src/app/community-decks/meta/page.tsx src/app/community-decks/page.tsx git-commit233.bat
git commit -m "feat(decks): dalijimosi kodai (export/import base64 'RVN1-' binarinis) - Kodas mygtukas kaladeje (kopijuoja), Ikelti koda mano-kaladese (sukuria kalade is kodo) + meta statistikos puslapis /community-decks/meta (populiariausios frakcijos + kortos is viesu kaladziu)"
git push
) > commit233.log 2>&1

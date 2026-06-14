@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add "src/app/cards/[cardNumber]/page.tsx" src/components/deck-builder/DeckCardPool.tsx src/components/community/ReadOnlyDeckList.tsx git-commit72.bat
git commit -m "ui: isimti efekto/aprasymo tekstu blokai visur viesai (kortos detale, deck builderio modalas, viesu kaladziu perziura) - viskas matosi kortos paveiksle; paieska ir toliau naudoja teksta"
git push
) > commit72.log 2>&1

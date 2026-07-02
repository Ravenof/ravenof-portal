@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/tutorial/TutorialGame.tsx src/components/admin/AdminCardsTable.tsx src/app/admin/cards/page.tsx src/components/admin/CardImageUpload.tsx
git commit -m "feat: zurnala uzdaryti braukiant i desine; detalus kortos view rodo tik korta (be papildomo teksto); admin korteliu lentele - akies ikona dideliam perziurai; admin kortos redagavime paspaudus paveiksla atsidaro detalus pop-up"
git push
git log -1 --oneline
) > commit110.log 2>&1

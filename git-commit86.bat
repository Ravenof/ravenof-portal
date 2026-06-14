@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/app/admin/cards/new/page.tsx "src/app/admin/cards/[cardId]/page.tsx" src/components/admin/CardForm.tsx src/components/admin/GameplayConfigEditor.tsx git-commit86.bat
git commit -m "feat(admin): summon konkreciu kortu pasirinkimas dropdown'u (vietoj rasymo) - kortu sarasas uzkraunamas i editoriu, pridedi per dropdown, salini chip'ais"
git push
) > commit86.log 2>&1

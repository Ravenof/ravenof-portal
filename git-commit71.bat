@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/admin/CardForm.tsx git-commit71.bat
git commit -m "ui(admin): isimtas efekto/aprasymo/lore teksto blokas is kortos formos (matosi paveiksle); palikti tik paslepti laukai (kad nesitrintu) + gameplay mapinimas"
git push
) > commit71.log 2>&1

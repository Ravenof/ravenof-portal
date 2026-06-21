@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/admin/GameplayConfigEditor.tsx git-commit188.bat
git commit -m "feat(admin/effects): union taikiniai (padaras/artefaktas/zaidejas/cempionas su varnelemis) ir + Tada padaryk dar grandineje + greitas preset mygtukas (padaras/artefaktas/zaidejas) ir pagrindiniam efektui - pvz kovos suksnis 2 dmg creature/artefaktui/zaidejui su zaidejo pasirinkimu"
git push
) > commit188.log 2>&1

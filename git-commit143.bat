@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/admin/GameplayConfigEditor.tsx
git commit -m "feat(admin): branch trigger - visi 'onAny*' (globalus) trigeriai atpazystami pagal prefiksa (kieno ivykis filtras + salyga); aiskesnis aprasymas: salyga > kas triggers > efektas"
git push
git log -1 --oneline
) > commit143.log 2>&1

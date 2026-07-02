@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/digital/DigitalAlbum.tsx src/app/digital/album/page.tsx src/app/digital/layout.tsx src/components/digital/DigitalHub.tsx
git commit -m "feat(digital): FAZE 2 - kortu albumas (/digital/album) binderis su besivercianciais puslapiais (3x3 kisenes, page-flip), pakuociu atplesimas perkeltas i albuma (is parduotuves), digital nav Albumas"
git push
git log -1 --oneline
) > commit137.log 2>&1

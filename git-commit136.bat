@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/digital/Flames.tsx src/components/layout/MobileNav.tsx src/app/digital/layout.tsx src/app/digital/page.tsx src/components/digital/DigitalHub.tsx
git commit -m "feat(digital): FAZE 1 - atskira pilno ekrano Digital aplinka. Savas nav + Iseiti mygtukas, paslepetas portalo apatinis nav, dark-fantasy liepsnu fonas + ambient muzika (po prisilietimo) + garsai ant mygtuku. Bendras Flames komponentas"
git push
git log -1 --oneline
) > commit136.log 2>&1

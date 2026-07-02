@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
( git add src/lib/nav.ts src/components/layout/MobileNav.tsx src/app/page.tsx & git commit -m "feat(nav): Ravenof Digital home screen pagrindinis blokas + bottom nav (mobile) skiltis 'Digital' (Gamepad ikona) + quick links" & git push ) > commit94.log 2>&1

@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add capacitor.config.ts mobile-shell/index.html setup-capacitor.bat CAPACITOR-ANDROID.md package.json git-commit239.bat
git commit -m "feat(android): Capacitor remote-URL shell skirtas /digital -> Google Play. capacitor.config.ts (server.url=vercel/digital, allowNavigation domenui, splash/statusbar), mobile-shell loading/offline fallback (mazas webDir), setup-capacitor.bat (npm install + cap add android + sync), CAPACITOR-ANDROID.md pilna instrukcija (signing/AAB/Play Console/IAP ispejimas/native bridge). @capacitor/* v8 paketai i package.json. Web/SSR/auth/admin nepakeisti."
git push
) > commit239.log 2>&1

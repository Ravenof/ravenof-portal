@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add public/arenas/arcane.jpg public/arenas/citadel.jpg public/arenas/crypt.jpg public/arenas/inferno.jpg git-commit167.bat
git commit -m "feat(arena): ikelti tikri arenu fonai - arcane, citadel, crypt, inferno (file-first uzdengia proceduriniu; kiti 4 lieka proceduriniai)"
git push
) > commit167.log 2>&1

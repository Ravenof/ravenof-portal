@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add run-migrations.bat
git add git-commit434.bat
git commit -m "chore(tools): run-migrations.bat perrasytas CRLF formatu (LF endings del kuriu cmd prasisukdavo be klausimo), DATABASE_URL klausiama PRIES npm install, tuscias ivedimas nutraukia su pranesimu, npm i --no-save pg (nebeliecia package.json). Patikrinta realiai: 11/11 migraciju (20260810-20260820) pritaikyta per Session pooler." > commit434.log 2>&1
git push >> commit434.log 2>&1
type commit434.log
echo ============= BAIGTA (run-migrations fix). =============

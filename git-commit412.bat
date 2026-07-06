@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
echo === Pridedam ===
git add src/components/digital/DigitalHub.tsx
git add git-commit412.bat
echo === Commit ===
git commit -m "fix(menu): Home garantuotai telpa be scroll - dar labiau sumazintas hero (heading clamp 16-34, cta 38-74) + apacios eile (50-84). Kartu pushinam ir ankstesnius commit410/411 (kompaktiskas h-full overflow-hidden Home + orientacijos JS) i Vercel." > commit412.log 2>&1
echo === Push (nueina ir 410/411/412) ===
git push >> commit412.log 2>&1
type commit412.log
echo.
echo ============= BAIGTA. Palauk Vercel deploy ~1min, tada perkrauk appa. =============

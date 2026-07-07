@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/ranked/RankedClient.tsx
git add git-commit420.bat
git commit -m "fix(ranked): PLAY mygtukas visada matomas. Centrinis blokas pertvarkytas: virsus (flex-1) = rango badge+vardas kaireje + progresas/info desineje (horizontaliai, kompaktiska); apacia (shrink-0) = IESKOTI KOVOS mygtukas - nebekarpomas. tsc svarus." > commit420.log 2>&1
git push >> commit420.log 2>&1
type commit420.log
echo ============= BAIGTA (ranked play btn). =============

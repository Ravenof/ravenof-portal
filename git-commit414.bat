@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/ranked/RankedClient.tsx
git add git-commit414.bat
git commit -m "fix(ranked): paneliu clipping/overlap. Visi 3 stulpeliai justify-between (emblema virsuj + CTA apacioj niekada nebekarpomi; vidurys tarp ju). Rango emblema 72->54, skrynia mazesne, statistikos tiles be flex-1 (nebesqueezina teksto). Iki rango kritimo + IESKOTI KOVOS dabar matomi. tsc svarus." > commit414.log 2>&1
git push >> commit414.log 2>&1
type commit414.log
echo ============= BAIGTA. =============

@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/team2v2/engine.ts src/components/digital/Team2v2Battle.tsx git-commit205.bat
git commit -m "feat(2v2): ZMK zalos modifikatoriai kovose (per seat bag 20 kortu, traukiama per ataka, +0/+1/-1/+2/-2/x2/x0; veikia face ir trade), ZMK flash UI prie seat o; pergale apdovanoja +100 auksu (rvn_award_gold pvp_unranked)"
git push
) > commit205.log 2>&1

@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/team2v2/types.ts src/lib/team2v2/setup.ts src/components/digital/DigitalCoop.tsx src/app/digital/coop/page.tsx src/components/digital/DigitalHub.tsx git-commit203.bat
git commit -m "feat(2v2): FAZE 1 pamatas - team2v2 busenos modelis (4 seat, 2 komandos, bendras 60 HP, damageTeam), co-op vs botai saranka (ranked botai kaip AI sajungininkas+2 priesai, pazymeti AI), /digital/coop lobby + hub plytele. Realaus laiko 2v2 kovos variklis - kita faze"
git push
) > commit203.log 2>&1

@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git rm -f src/lib/team2v2/engine.ts src/lib/team2v2/cards.ts src/lib/team2v2/setup.ts src/lib/team2v2/types.ts src/components/digital/Team2v2Battle.tsx
git add src/components/digital/DigitalCoop.tsx git-commit207.bat
git commit -m "refactor(2v2): pasalintas klaidingas realaus laiko prototipas (team2v2 engine/cards/setup/types, Team2v2Battle); DigitalCoop = placeholder. Teisingas dizainas: 2v2 = 1v1 mechanika, komandos ejimai (1=A,2=B), bendras 60HP, kiekvienas zaidejas savo auksas, draugiski efektai visai komandai. Variklio generalizacija (4 seat/2 team) - etapais"
git push
) > commit207.log 2>&1

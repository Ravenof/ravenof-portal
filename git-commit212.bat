@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/team2v2/ai.ts git-commit212.bat
git commit -m "feat(2v2 stage5a): naujas 2v2 AI (aiActFor) - zaidzia bet kuriam botu seatui per tikra varikli (playCard/attack, efektai auto-parenka komandiskai); 1v1 AI nepaliestas, tsc svarus"
git push
) > commit212.log 2>&1

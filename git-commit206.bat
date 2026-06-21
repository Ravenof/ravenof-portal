@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/team2v2/engine.ts src/lib/team2v2/cards.ts src/components/digital/Team2v2Battle.tsx git-commit206.bat
git commit -m "feat(2v2): kovos suksniu (battlecry) palaikymas - onSummon/onPlay efektai parse is gameplay (damage/aoeDamage/heal/buffAtk/buffHp/draw), resolve playUnit metu su komandine taikymo logika (zaidejui ir botams); ivykiu log juosta UI"
git push
) > commit206.log 2>&1

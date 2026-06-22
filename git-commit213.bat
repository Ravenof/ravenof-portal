@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git rm -f --ignore-unmatch src/lib/team2v2/engine.ts src/lib/team2v2/cards.ts src/lib/team2v2/setup.ts src/lib/team2v2/types.ts src/components/digital/Team2v2Battle.tsx
git add src/lib/tutorial/engine.ts src/lib/team2v2/ai.ts src/lib/team2v2/load.ts src/components/digital/Team2v2Game.tsx src/components/digital/DigitalCoop.tsx git-commit213.bat
git commit -m "feat(2v2 stage5b): zaidziama 2v2 co-op vs botai - legalTargets/attack komandiniai (target.side/enemySeats; 1v1 identiska), kortu uzkrovikis 4 seatams (load.ts, pilna mechanika), Team2v2Game UI (4 lentos, 2 komandu HP, komandos ejimas, ranka, ataku taikymas, AI ally+priesai), DigitalCoop lobby paleidimas. Naudoja tikra varikli (ZMK/efektai/battlecry). v1 ribos: global-listener passyvai/auros skenuoja tik you/ai"
git push
) > commit213.log 2>&1

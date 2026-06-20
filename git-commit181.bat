@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/tutorial/ai/aiTypes.ts src/lib/tutorial/ai/aiEngine.ts src/lib/tutorial/ai.ts src/lib/ranked/aiStrategy.ts src/components/tutorial/TutorialGame.tsx src/components/digital/ranked/RankedClient.tsx git-commit181.bat
git commit -m "feat(ranked): per-bot strategijos modifikatoriai - aiStrategy delta ant difficulty bazes (aggro/control/tempo/curse/stealth/defensive/midrange + aggression/control/trade/risk intensyvumai) moduliuoja faceBias/tradeThreshold/spellWasteGuard/removalMinValue/jitter; mergeWeights aiTypes; aiNextAction/decideAiTurn priima weights; RankedClient paduoda boto strategija pagal slug"
git push
) > commit181.log 2>&1

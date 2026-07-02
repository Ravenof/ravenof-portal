@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
del /f /q "__ai_smoke.ts" >nul 2>&1
(
git add src/lib/tutorial/ai.ts src/lib/tutorial/ai/aiTypes.ts src/lib/tutorial/ai/aiCardRole.ts src/lib/tutorial/ai/aiThreatEvaluation.ts src/lib/tutorial/ai/aiTargeting.ts src/lib/tutorial/ai/aiScoring.ts src/lib/tutorial/ai/aiActions.ts src/lib/tutorial/ai/aiEngine.ts
git commit -m "feat(ai): scoring-based AI decision engine - board trade skaiciavimas, target value scoring, lethal + survival vertinimas, AoE/buff/heal/removal logika be bevergiu burtu, face tik kai verta, difficulty (easy/normal/hard), debug logai. Padalinta i ai/ modulius (aiEngine/aiScoring/aiActions/aiThreatEvaluation/aiTargeting/aiCardRole)"
git push
git log -1 --oneline
) > commit116.log 2>&1

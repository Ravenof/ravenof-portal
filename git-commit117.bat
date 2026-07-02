@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/tutorial/TutorialGame.tsx src/components/tutorial/PracticeButton.tsx src/lib/tutorial/ai/aiFocusFire.ts src/lib/tutorial/ai/aiEngine.ts
git commit -m "feat(ai): focus-fire / cumulative damage planner + AI sunkumo pasirinkimas UI. AI nebeignoruoja high-HP/Taunt padaru - skaiciuoja bendra zala per seka (keli puolejai + burtas + buff + cempiono skill), nuima Taunt, daro prasminga partial damage, lygina focus-fire vs face. PracticeButton: easy/normal/hard pasirinkimas"
git push
git log -1 --oneline
) > commit117.log 2>&1

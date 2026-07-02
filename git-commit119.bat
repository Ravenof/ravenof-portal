@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/tutorial/TutorialGame.tsx src/lib/tutorial/ai/aiEngine.ts src/lib/tutorial/ai/aiCardRole.ts src/lib/tutorial/ai/aiScoring.ts
git commit -m "fix(ai): client-side crash kovojant pries bota. AI sprendimas apgaubtas try/catch (klaida nebegriauna zaidimo - saugiai baigiamas AI ejimas + console.error). Root cause: analyzeMappings krito ant korta su nepilnu mapping'u (m.effect undefined -> .startsWith throw) - pridetas guard"
git push
git log -1 --oneline
) > commit119.log 2>&1

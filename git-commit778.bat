@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/version.ts src/components/tutorial/TutorialGame.tsx src/components/tutorial2/TutorialDirector.tsx src/components/tutorial2/TutorialOverlay.tsx src/components/digital/progression/RewardCelebration.tsx src/data/tutorialLessons/lessonSeeds.ts git-commit778.bat
git commit -m "778: mokymu gyvo perejimo pataisos. 4 pamoka: paryskinama pirmos fazes cempiono korta (buvo antros, kurios dar negalima suzaisti); 2, 3 ir 6 pamokos: pirmas veiksmo zingsnis vel turi rodykle ir ziedus ant padaru; 8 pamoka: mulligano scena nebepriartinama (penkta korta islisdavo uz ekrano); kartojant pamoka neberodomi atlygiai, kuriu negauni; atlygio plyteles: Korta, Zenklelis, +1 Boosteriu vietoj Atlygis Atlygis; tekstai: Padegk, Auka" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit778.log 2>&1

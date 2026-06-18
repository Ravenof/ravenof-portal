@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git rm -f --ignore-unmatch public/sounds/music/battle-7.mp3
git add src/lib/game/musicManager.ts src/app/digital/layout.tsx src/components/tutorial/TutorialGame.tsx src/components/digital/DigitalHub.tsx public/sounds/music/battle-3.mp3 public/sounds/music/battle-6.mp3 git-commit147.bat
git commit -m "feat(audio): main menu tema per visus /digital puslapius (layout), pasalintas senas synth ambient (kovoje ir menu); 6 kovos trekai (battle-7 pasalintas); atnaujinti battle-3/6 mp3"
git push
) > commit147.log 2>&1

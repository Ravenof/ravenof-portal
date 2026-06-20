@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/life-tracker/LifePanel.tsx src/app/life-tracker/LifeTrackerClient.tsx src/components/tutorial/TutorialGame.tsx src/components/tutorial/BattleFxLayer.tsx git-commit172.bat
git commit -m "feat(hp): HP vial su skysciu - digital musyje (kompaktiskas, vietoj sirdutes) ir life-tracker irankyje (didelis su banga+burbulais); uzpildymas pagal HP/max, spalva hue 120-0 (zalia->geltona->oranzine->raudona palaipsniui), <10 HP pulsuoja"
git push
) > commit172.log 2>&1

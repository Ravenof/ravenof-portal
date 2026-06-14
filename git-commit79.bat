@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/types.ts src/components/tutorial/TutorialGame.tsx src/components/admin/GameplayConfigEditor.tsx git-commit79.bat
git commit -m "feat(admin): padaro statiniu raktazodziu pasirinkimas (Sprintas/Pasisaipymas/Magiskasis skydas/Selinimas) gameplay mapinime - gameplay.keywords, sujungiama su detektuotais zaidime"
git push
) > commit79.log 2>&1

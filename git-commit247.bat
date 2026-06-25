@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit246.bat git-commit247.bat
git commit -m "feat(battle): traukiama korta deck -> pop centre -> ranka; reveal kaip maza kortos dydzio pop-out PRIE taikinio (burtai/efektai/atakos), nebe centre. Varzovo rankos nugareliu veduokle su parallax (card-back kosmetikai). Backup _fx_backup_*/.bak."
git push
) > commit247.log 2>&1

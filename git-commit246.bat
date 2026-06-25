@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit246.bat
git commit -m "feat(battle): kovos reveal/animacijos. (1) Card draw - vietoj centrinio overlap'inancio popup korta atskrieja is kalades i ranka (tavo - atversta, priesininko - nugarele). (2) Burtu/prakeiksmu reveal - mazesnis ir virsuje (nebeuzdengia lentos). (3) Varzovo ranka - kortu nugareliu veduokle kuri lenkiasi link zvilgsnio (parallax; card-back kosmetikai). Field->kapinynas skrydis jau veike. Backup: _fx_backup_*/ (.bak)."
git push
) > commit246.log 2>&1

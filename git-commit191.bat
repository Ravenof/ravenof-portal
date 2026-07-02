@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/TutorialGame.tsx src/components/admin/GameplayConfigEditor.tsx git-commit191.bat
git commit -m "fix(battle): daugkartinis traukimas rodo VISAS ištrauktas kortas eileje (ne tik paskutine); feat(fx): efekto elemento animacija (ugnis/zaibas/ledas/nuodai) nuspalvina AoE banga, projektila ir zalos skaiciu - veikia AoE ir cempionu efektams; redaktoriuje laukas pervardytas Animacijos elementas (AoE/zala)"
git push
) > commit191.log 2>&1
